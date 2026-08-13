param(
    [string]$Url = 'http://127.0.0.1:8765/playground.html',
    [string]$ScreenshotPath = '',
    [string]$RubyScreenshotPath = '',
    [string]$OpeningScreenshotPath = '',
    [string]$RewardScreenshotPath = ''
)

$ErrorActionPreference = 'Stop'

$browserCandidates = @(
    'C:\Program Files\Google\Chrome\Application\chrome.exe',
    'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
)
$browserExe = $browserCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
if (-not $browserExe) {
    throw 'No se encontro Chrome ni Edge.'
}

$debugPort = Get-Random -Minimum 9300 -Maximum 9900
$testProfile = Join-Path ([System.IO.Path]::GetTempPath()) ('lucio-cdp-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $testProfile | Out-Null
$browserProcess = $null
$socket = $null
$script:messageId = 0
$script:browserEvents = [System.Collections.Generic.List[object]]::new()

function Receive-CdpMessage {
    $buffer = New-Object byte[] 65536
    $stream = [System.IO.MemoryStream]::new()
    do {
        $segment = [ArraySegment[byte]]::new($buffer)
        $result = $script:socket.ReceiveAsync($segment, [Threading.CancellationToken]::None).GetAwaiter().GetResult()
        if ($result.MessageType -eq [System.Net.WebSockets.WebSocketMessageType]::Close) {
            throw 'El navegador cerro la conexion CDP.'
        }
        $stream.Write($buffer, 0, $result.Count)
    } until ($result.EndOfMessage)
    $json = [Text.Encoding]::UTF8.GetString($stream.ToArray())
    $stream.Dispose()
    return $json | ConvertFrom-Json
}

function Invoke-Cdp {
    param(
        [Parameter(Mandatory)][string]$Method,
        [hashtable]$Params = @{}
    )
    $script:messageId += 1
    $requestId = $script:messageId
    $request = @{ id = $requestId; method = $Method; params = $Params } | ConvertTo-Json -Depth 20 -Compress
    $bytes = [Text.Encoding]::UTF8.GetBytes($request)
    $segment = [ArraySegment[byte]]::new($bytes)
    $script:socket.SendAsync($segment, [System.Net.WebSockets.WebSocketMessageType]::Text, $true, [Threading.CancellationToken]::None).GetAwaiter().GetResult() | Out-Null

    while ($true) {
        $message = Receive-CdpMessage
        if ($message.id -eq $requestId) {
            if ($message.error) { throw "CDP $Method fallo: $($message.error.message)" }
            return $message.result
        }
        $script:browserEvents.Add($message)
    }
}

function Invoke-PageScript {
    param([Parameter(Mandatory)][string]$Expression)
    $result = Invoke-Cdp -Method 'Runtime.evaluate' -Params @{
        expression = $Expression
        returnByValue = $true
        awaitPromise = $true
    }
    if ($result.exceptionDetails) {
        throw "JavaScript fallo: $($result.exceptionDetails.text)"
    }
    return $result.result.value
}

function Assert-Equal {
    param($Actual, $Expected, [string]$Label)
    if ($Actual -ne $Expected) {
        throw "$Label - esperado '$Expected', recibido '$Actual'."
    }
    Write-Output "PASS $Label => $Actual"
}

function Save-CdpScreenshot {
    param([Parameter(Mandatory)][string]$Path)
    $capture = Invoke-Cdp -Method 'Page.captureScreenshot' -Params @{ format = 'png'; fromSurface = $true }
    [IO.File]::WriteAllBytes($Path, [Convert]::FromBase64String($capture.data))
    Write-Output "SCREENSHOT $Path"
}

try {
    $arguments = @(
        '--headless=new',
        '--disable-gpu',
        '--hide-scrollbars',
        '--no-first-run',
        '--remote-allow-origins=*',
        "--remote-debugging-port=$debugPort",
        "--user-data-dir=$testProfile",
        'about:blank'
    )
    $browserProcess = Start-Process -FilePath $browserExe -ArgumentList $arguments -WindowStyle Hidden -PassThru

    $targets = $null
    for ($attempt = 0; $attempt -lt 40 -and -not $targets; $attempt += 1) {
        Start-Sleep -Milliseconds 125
        try {
            $targets = Invoke-RestMethod -Uri "http://127.0.0.1:$debugPort/json/list" -TimeoutSec 1
        } catch {
            $targets = $null
        }
    }
    $pageTarget = $targets | Where-Object { $_.type -eq 'page' } | Select-Object -First 1
    if (-not $pageTarget) { throw 'No se pudo obtener el target CDP del navegador.' }

    $script:socket = [System.Net.WebSockets.ClientWebSocket]::new()
    $script:socket.ConnectAsync([Uri]$pageTarget.webSocketDebuggerUrl, [Threading.CancellationToken]::None).GetAwaiter().GetResult() | Out-Null
    Invoke-Cdp -Method 'Page.enable' | Out-Null
    Invoke-Cdp -Method 'Runtime.enable' | Out-Null
    Invoke-Cdp -Method 'Emulation.setDeviceMetricsOverride' -Params @{
        width = 390
        height = 844
        deviceScaleFactor = 1
        mobile = $true
        screenWidth = 390
        screenHeight = 844
    } | Out-Null
    Invoke-Cdp -Method 'Page.navigate' -Params @{ url = $Url } | Out-Null

    $ready = $false
    for ($attempt = 0; $attempt -lt 60 -and -not $ready; $attempt += 1) {
        Start-Sleep -Milliseconds 100
        $ready = Invoke-PageScript -Expression "document.readyState === 'complete' && document.querySelector('[data-lucio-stage]')?.children.length === 1"
    }
    Assert-Equal $ready $true 'carga y render inicial'

    $viewportWidth = Invoke-PageScript -Expression 'window.innerWidth'
    Assert-Equal $viewportWidth 390 'viewport movil real'
    $overflow = Invoke-PageScript -Expression 'document.documentElement.scrollWidth <= window.innerWidth'
    Assert-Equal $overflow $true 'sin overflow horizontal'
    $paintOverflow = Invoke-PageScript -Expression 'getComputedStyle(document.querySelector(".lucio-renderer")).overflow'
    Assert-Equal $paintOverflow 'visible' 'canvas visual sin recorte'

    $shinyDefaults = Invoke-PageScript -Expression 'JSON.stringify(GAME_CONFIG.visualPresets.shinyModifier)'
    $expectedShinyDefaults = '{"shiny":{"glowBoost":0.35,"brightness":1.12,"rimOpacity":0.86,"rimSize":16,"sparkleColor":"#ffffff","overlayOpacity":0.9,"overlayScale":1.04,"overlaySpeed":1.75,"rotation":0,"offsetX":0,"offsetY":0},"shine":{"width":11,"speed":1.1,"angle":-42,"intensity":0.85,"frequency":3.8},"pulse":{"speed":1.35,"intensity":0.5,"scale":1.035}}'
    Assert-Equal $shinyDefaults $expectedShinyDefaults 'preset Shiny exacto y sin rayos'

    $openingDefaults = Invoke-PageScript -Expression 'JSON.stringify(Object.fromEntries(["entryDuration","shakeStrength","shakeDuration","shakeRotation","impactScale","flashDuration","flashIntensity","openingDuration","lucioDelay","riseDuration","riseDistance","finalBounce","revealDuration","mysterySwapPoint","mysteryFadeDuration"].map(key=>[key,GAME_CONFIG.opening[key]])))'
    $expectedOpeningDefaults = '{"entryDuration":760,"shakeStrength":16,"shakeDuration":310,"shakeRotation":5,"impactScale":1.08,"flashDuration":660,"flashIntensity":0.85,"openingDuration":650,"lucioDelay":680,"riseDuration":850,"riseDistance":30,"finalBounce":1.15,"revealDuration":1400,"mysterySwapPoint":0.35,"mysteryFadeDuration":480}'
    Assert-Equal $openingDefaults $expectedOpeningDefaults 'preset base de mochila exacto'

    $allSpritesLoaded = Invoke-PageScript -Expression '(()=>{const select=document.querySelector("[data-lucio-material]");const result={};for(const material of ["bronze","silver","gold","ruby","diamond","cosmic"]){select.value=material;select.dispatchEvent(new Event("change",{bubbles:true}));const image=document.querySelector("[data-lucio-stage] .lucio-sprite");result[material]={file:image.src.split("/").pop(),complete:image.complete,width:image.naturalWidth,height:image.naturalHeight,opacity:getComputedStyle(image).opacity,visibility:getComputedStyle(image).visibility}}return result})()'
    Assert-Equal $allSpritesLoaded.bronze.width 1024 'sprite Bronce cargado'
    Assert-Equal $allSpritesLoaded.silver.width 1024 'sprite Plata cargado'
    Assert-Equal $allSpritesLoaded.gold.width 1024 'sprite Oro cargado'
    Assert-Equal $allSpritesLoaded.ruby.width 1024 'sprite Rubi cargado'
    Assert-Equal $allSpritesLoaded.ruby.file 'LucioRuby.png' 'ruta del sprite Rubi'
    Assert-Equal $allSpritesLoaded.ruby.opacity '1' 'opacidad del sprite Rubi'
    Assert-Equal $allSpritesLoaded.diamond.width 1024 'sprite Diamante cargado'
    Assert-Equal $allSpritesLoaded.cosmic.width 1024 'sprite Cosmico cargado'

    $shinyClass = Invoke-PageScript -Expression '(()=>{const toggle=document.querySelector("[data-shiny-modifier]"); toggle.checked=true; toggle.dispatchEvent(new Event("change",{bubbles:true})); return document.querySelector("[data-lucio-stage] .lucio-renderer").classList.contains("is-shiny")})()'
    Assert-Equal $shinyClass $true 'toggle Shiny visible'
    $shineAnimation = Invoke-PageScript -Expression 'getComputedStyle(document.querySelector("[data-lucio-stage] .lucio-shine img")).animationName'
    Assert-Equal $shineAnimation 'shine-sweep' 'shine sweep activo'
    $glowVisible = Invoke-PageScript -Expression '(()=>{const renderer=document.querySelector("[data-lucio-stage] .lucio-renderer");const sprite=renderer.querySelector(".lucio-sprite");return !renderer.querySelector(".lucio-glow-sprite") && getComputedStyle(sprite).filter.includes("drop-shadow")})()'
    Assert-Equal $glowVisible $true 'glow aplicado al sprite base'
    $sparklesLoaded = Invoke-PageScript -Expression '(()=>{const image=document.querySelector("[data-lucio-stage] .lucio-overlay--sparkles"); return image.complete && image.naturalWidth===1024 && Number(getComputedStyle(image).opacity)>0})()'
    Assert-Equal $sparklesLoaded $true 'destellos normales como imagen'
    $sparkleColor = Invoke-PageScript -Expression '(()=>{const input=document.querySelector("[data-path=''sparkles.color'']"); input.value="#00ff00"; input.dispatchEvent(new Event("input",{bubbles:true})); return document.querySelector("[data-lucio-stage] .lucio-sparkle-flood").getAttribute("flood-color")})()'
    Assert-Equal $sparkleColor '#00ff00' 'color de destellos configurable'
    $shinyLoaded = Invoke-PageScript -Expression '(()=>{const image=document.querySelector("[data-lucio-stage] .lucio-overlay--shiny"); return image.complete && image.naturalWidth===1024 && Number(getComputedStyle(image).opacity)>0})()'
    Assert-Equal $shinyLoaded $true 'destellos Shiny como imagen'
    $shinyEasing = Invoke-PageScript -Expression 'getComputedStyle(document.querySelector("[data-lucio-stage] .lucio-overlay--shiny")).animationTimingFunction'
    Assert-Equal $shinyEasing 'ease-in-out' 'movimiento Shiny suavizado'
    $shinyColor = Invoke-PageScript -Expression '(()=>{const input=document.querySelector("[data-path=''shiny.sparkleColor'']"); input.value="#ff0000"; input.dispatchEvent(new Event("input",{bubbles:true})); return document.querySelector("[data-lucio-stage] .lucio-shiny-flood").getAttribute("flood-color")})()'
    Assert-Equal $shinyColor '#ff0000' 'color de destellos Shiny configurable'

    $materialReset = Invoke-PageScript -Expression '(()=>{const input=document.querySelector("[data-path=''glow.size'']");input.value="69";input.dispatchEvent(new Event("input",{bubbles:true}));document.querySelector("[data-reset-material]").click();return document.querySelector("[data-path=''glow.size'']").value})()'
    Assert-Equal $materialReset '42' 'reset de material'
    $shinyReset = Invoke-PageScript -Expression '(()=>{const input=document.querySelector("[data-path=''shiny.rimSize'']");input.value="39";input.dispatchEvent(new Event("input",{bubbles:true}));document.querySelector("[data-reset-shiny]").click();return document.querySelector("[data-path=''shiny.rimSize'']").value})()'
    Assert-Equal $shinyReset '16' 'reset de Shiny'
    $versionSaved = Invoke-PageScript -Expression '(()=>{window.prompt=()=>"Comparativa A";const scope=document.querySelector("[data-library-scope-select]");scope.value="material";scope.dispatchEvent(new Event("change",{bubbles:true}));document.querySelector("[data-save-version]").click();return document.querySelector("[data-preset-version-select]").options.length})()'
    Assert-Equal $versionSaved 1 'guardar version por material'
    $versionLoaded = Invoke-PageScript -Expression '(()=>{const input=document.querySelector("[data-path=''glow.size'']");input.value="68";input.dispatchEvent(new Event("input",{bubbles:true}));document.querySelector("[data-load-version]").click();return document.querySelector("[data-path=''glow.size'']").value})()'
    Assert-Equal $versionLoaded '42' 'cargar version guardada'
    $shinyVersionSaved = Invoke-PageScript -Expression '(()=>{window.prompt=()=>"Shiny Alpha";const scope=document.querySelector("[data-library-scope-select]");scope.value="shinyModifier";scope.dispatchEvent(new Event("change",{bubbles:true}));document.querySelector("[data-save-version]").click();return document.querySelector("[data-preset-version-select]").options[0].textContent.includes("Shiny Alpha")})()'
    Assert-Equal $shinyVersionSaved $true 'guardar version Shiny separada'
    $libraryStored = Invoke-PageScript -Expression '(()=>{const data=JSON.parse(localStorage.getItem("lucioFxPresetLibrary.v1"));return data.materials.cosmic.length===1&&data.shinyModifier.length===1})()'
    Assert-Equal $libraryStored $true 'biblioteca separa materiales y Shiny'

    $timingNormalBronze = Invoke-PageScript -Expression 'window.resolveRewardTimings(GAME_CONFIG.opening,{material:"bronze",shiny:false})'
    Assert-Equal $timingNormalBronze.riseDuration 1400 'timing normal Bronce subida'
    Assert-Equal $timingNormalBronze.revealDuration 1500 'timing normal Bronce reveal'
    Assert-Equal $timingNormalBronze.mysterySwapPoint 0.35 'timing normal Bronce cambio'
    $timingNormalRuby = Invoke-PageScript -Expression 'window.resolveRewardTimings(GAME_CONFIG.opening,{material:"ruby",shiny:false})'
    Assert-Equal $timingNormalRuby.riseDuration 1400 'timing normal Rubi subida'
    Assert-Equal $timingNormalRuby.revealDuration 1500 'timing normal Rubi reveal'
    Assert-Equal $timingNormalRuby.mysterySwapPoint 0.65 'timing normal Rubi cambio'
    $timingShinyRuby = Invoke-PageScript -Expression 'window.resolveRewardTimings(GAME_CONFIG.opening,{material:"ruby",shiny:true})'
    Assert-Equal $timingShinyRuby.riseDuration 2400 'timing Shiny Rubi subida'
    Assert-Equal $timingShinyRuby.revealDuration 3000 'timing Shiny Rubi reveal'
    Assert-Equal $timingShinyRuby.mysterySwapPoint 0.65 'timing Shiny Rubi cambio'
    $timingShinyDiamond = Invoke-PageScript -Expression 'window.resolveRewardTimings(GAME_CONFIG.opening,{material:"diamond",shiny:true})'
    Assert-Equal $timingShinyDiamond.mysterySwapPoint 0.95 'timing Shiny Diamante cambio'

    $state = Invoke-PageScript -Expression "document.querySelector('[data-start-opening]').click(); document.querySelector('[data-opening-stage]').dataset.state"
    Assert-Equal $state 'entering' 'inicio determinista'
    $liveRiseDuration = Invoke-PageScript -Expression 'document.querySelector("[data-opening-stage]").style.getPropertyValue("--rise-duration")'
    Assert-Equal $liveRiseDuration '2400ms' 'timing del drop aplicado antes de animar'
    $mystery = Invoke-PageScript -Expression 'document.querySelector(".reward-layer--mystery .lucio-sprite").src.includes("LucioMistery.png")'
    Assert-Equal $mystery $true 'Lucio Mistery preparado'
    $rewardGeometry = Invoke-PageScript -Expression '(()=>{const slot=document.querySelector("[data-reward-slot]").getBoundingClientRect(); return Math.abs(slot.height/slot.width-1.5)<0.02})()'
    Assert-Equal $rewardGeometry $true 'geometria original del reward'
    $state = Invoke-PageScript -Expression "document.querySelector('[data-opening-stage]').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true})); document.querySelector('[data-opening-stage]').dataset.state"
    Assert-Equal $state 'awaiting-taps' 'skip de entrada'
    $state = Invoke-PageScript -Expression "const s=document.querySelector('[data-opening-stage]'); for(let i=0;i<3;i++) s.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true})); s.dataset.state"
    Assert-Equal $state 'opening' 'tres taps rapidos'
    $state = Invoke-PageScript -Expression "document.querySelector('[data-opening-stage]').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true})); document.querySelector('[data-opening-stage]').dataset.state"
    Assert-Equal $state 'revealing' 'skip de apertura'
    $state = Invoke-PageScript -Expression "document.querySelector('[data-opening-stage]').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true})); document.querySelector('[data-opening-stage]').dataset.state"
    Assert-Equal $state 'reward-visible' 'skip de reveal'
    $swapped = Invoke-PageScript -Expression 'document.querySelector("[data-reward-slot]").classList.contains("is-swapped")'
    Assert-Equal $swapped $true 'Mistery reemplazado por reward'
    $state = Invoke-PageScript -Expression "document.querySelector('[data-opening-stage]').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true})); document.querySelector('[data-opening-stage]').dataset.state"
    Assert-Equal $state 'reward-visible' 'reward exige confirmacion'
    $state = Invoke-PageScript -Expression "document.querySelector('[data-confirm]').click(); document.querySelector('[data-opening-stage]').dataset.state"
    Assert-Equal $state 'idle' 'confirmacion reinicia'

    $normalAutoReveal = Invoke-PageScript -Expression '(()=>{const reward=document.querySelector("[data-reward-select]");reward.value="bronze";reward.dispatchEvent(new Event("change",{bubbles:true}));document.querySelector("[data-start-opening]").click();const stage=document.querySelector("[data-opening-stage]");stage.dispatchEvent(new PointerEvent("pointerdown",{bubbles:true,cancelable:true}));for(let i=0;i<3;i++)stage.dispatchEvent(new PointerEvent("pointerdown",{bubbles:true,cancelable:true}));stage.dispatchEvent(new PointerEvent("pointerdown",{bubbles:true,cancelable:true}));return new Promise(resolve=>setTimeout(()=>resolve(stage.dataset.state),1700))})()'
    Assert-Equal $normalAutoReveal 'reward-visible' 'reveal normal avanza automaticamente'
    $state = Invoke-PageScript -Expression 'document.querySelector("[data-confirm]").click();const reward=document.querySelector("[data-reward-select]");reward.value="cosmicShiny";reward.dispatchEvent(new Event("change",{bubbles:true}));document.querySelector("[data-opening-stage]").dataset.state'
    Assert-Equal $state 'idle' 'prueba automatica reinicia'

    $count = Invoke-PageScript -Expression 'document.querySelector("[data-count=''50'']").click(); document.querySelector("[data-performance-grid]").dataset.total'
    Assert-Equal $count '50' 'coleccion representa 50 copias'
    $visibleCount = Invoke-PageScript -Expression 'document.querySelectorAll("[data-performance-grid] .collection-copy").length'
    Assert-Equal $visibleCount 18 'coleccion limita nodos visibles'
    $fadeApplied = Invoke-PageScript -Expression 'new Promise(resolve=>requestAnimationFrame(()=>{const copies=document.querySelectorAll("[data-performance-grid] .collection-copy"); resolve(Number(copies[copies.length-1].style.opacity) < 0.2)}))'
    Assert-Equal $fadeApplied $true 'fade de coleccion grande'
    $openView = Invoke-PageScript -Expression "const v=document.querySelector('[data-backpack-view]'); v.value='open'; v.dispatchEvent(new Event('change',{bubbles:true})); document.querySelector('[data-backpack-image]').src.includes('Open.png')"
    Assert-Equal $openView $true 'vista aislada abierta'

    $exceptions = @($script:browserEvents | Where-Object { $_.method -eq 'Runtime.exceptionThrown' })
    Assert-Equal $exceptions.Count 0 'sin excepciones de runtime'

    if ($ScreenshotPath) {
        Invoke-PageScript -Expression '(()=>{for(const name of ["glow","sparkles"]){const toggle=document.querySelector(`[data-effect="${name}"]`); toggle.checked=true; toggle.dispatchEvent(new Event("change",{bubbles:true}))}const shiny=document.querySelector("[data-shiny-modifier]");shiny.checked=true;shiny.dispatchEvent(new Event("change",{bubbles:true}));document.querySelector("[data-lucio-stage]").scrollIntoView({block:"center"}); return new Promise(resolve=>setTimeout(()=>{for(const animation of document.querySelector("[data-lucio-stage]").getAnimations({subtree:true})){const duration=animation.effect?.getTiming().duration;if(Number.isFinite(duration)&&duration>0){animation.pause();animation.currentTime=duration*.36}} resolve(true)},260))})()' | Out-Null
        Save-CdpScreenshot -Path $ScreenshotPath
    }

    if ($RubyScreenshotPath) {
        Invoke-PageScript -Expression '(()=>{const select=document.querySelector("[data-lucio-material]");select.value="ruby";select.dispatchEvent(new Event("change",{bubbles:true}));const shiny=document.querySelector("[data-shiny-modifier]");shiny.checked=true;shiny.dispatchEvent(new Event("change",{bubbles:true}));document.querySelector("[data-lucio-stage]").scrollIntoView({block:"center",behavior:"instant"});return new Promise(resolve=>setTimeout(resolve,320))})()' | Out-Null
        Save-CdpScreenshot -Path $RubyScreenshotPath
    }

    if ($OpeningScreenshotPath -or $RewardScreenshotPath) {
        Invoke-PageScript -Expression '(()=>{document.documentElement.style.scrollBehavior="auto";document.querySelector("[data-start-opening]").click();const stage=document.querySelector("[data-opening-stage]");stage.dispatchEvent(new PointerEvent("pointerdown",{bubbles:true,cancelable:true}));for(let i=0;i<3;i++)stage.dispatchEvent(new PointerEvent("pointerdown",{bubbles:true,cancelable:true}));stage.dispatchEvent(new PointerEvent("pointerdown",{bubbles:true,cancelable:true}));stage.scrollIntoView({block:"center",behavior:"instant"});return new Promise(resolve=>setTimeout(resolve,420))})()' | Out-Null
        if ($OpeningScreenshotPath) { Save-CdpScreenshot -Path $OpeningScreenshotPath }
        Invoke-PageScript -Expression '(()=>{const stage=document.querySelector("[data-opening-stage]");stage.dispatchEvent(new PointerEvent("pointerdown",{bubbles:true,cancelable:true}));return new Promise(resolve=>setTimeout(resolve,180))})()' | Out-Null
        if ($RewardScreenshotPath) { Save-CdpScreenshot -Path $RewardScreenshotPath }
    }
} finally {
    if ($socket) { $socket.Dispose() }
    if ($browserProcess -and -not $browserProcess.HasExited) { Stop-Process -Id $browserProcess.Id -Force -ErrorAction SilentlyContinue }
    $resolvedTemp = [IO.Path]::GetFullPath([IO.Path]::GetTempPath())
    $resolvedProfile = [IO.Path]::GetFullPath($testProfile)
    if ($resolvedProfile.StartsWith($resolvedTemp, [StringComparison]::OrdinalIgnoreCase) -and (Split-Path $resolvedProfile -Leaf).StartsWith('lucio-cdp-')) {
        Remove-Item -LiteralPath $resolvedProfile -Recurse -Force -ErrorAction SilentlyContinue
    }
}
