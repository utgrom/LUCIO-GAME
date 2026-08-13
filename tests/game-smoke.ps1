param(
    [string]$Url = 'http://127.0.0.1:8765/index.html',
    [string]$TapScreenshotPath = '',
    [string]$ShopScreenshotPath = '',
    [string]$OpeningScreenshotPath = '',
    [string]$RewardScreenshotPath = '',
    [string]$CollectionScreenshotPath = '',
    [int]$ViewportWidth = 390,
    [int]$ViewportHeight = 844
)

$ErrorActionPreference = 'Stop'

$browserCandidates = @(
    'C:\Program Files\Google\Chrome\Application\chrome.exe',
    'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
)
$browserExe = $browserCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
if (-not $browserExe) { throw 'No se encontro Chrome ni Edge.' }

$debugPort = Get-Random -Minimum 9300 -Maximum 9900
$testProfile = Join-Path ([System.IO.Path]::GetTempPath()) ('lucio-game-cdp-' + [guid]::NewGuid().ToString('N'))
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
        if ($result.MessageType -eq [System.Net.WebSockets.WebSocketMessageType]::Close) { throw 'El navegador cerro la conexion CDP.' }
        $stream.Write($buffer, 0, $result.Count)
    } until ($result.EndOfMessage)
    $json = [Text.Encoding]::UTF8.GetString($stream.ToArray())
    $stream.Dispose()
    return $json | ConvertFrom-Json
}

function Invoke-Cdp {
    param([Parameter(Mandatory)][string]$Method, [hashtable]$Params = @{})
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
    if ($result.exceptionDetails) { throw "JavaScript fallo: $($result.exceptionDetails.text)" }
    return $result.result.value
}

function Assert-Equal {
    param($Actual, $Expected, [string]$Label)
    if ($Actual -ne $Expected) { throw "$Label - esperado '$Expected', recibido '$Actual'." }
    Write-Output "PASS $Label => $Actual"
}

function Assert-True {
    param($Actual, [string]$Label)
    Assert-Equal ([bool]$Actual) $true $Label
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
        try { $targets = Invoke-RestMethod -Uri "http://127.0.0.1:$debugPort/json/list" -TimeoutSec 1 } catch { $targets = $null }
    }
    $pageTarget = $targets | Where-Object { $_.type -eq 'page' } | Select-Object -First 1
    if (-not $pageTarget) { throw 'No se pudo obtener el target CDP del navegador.' }

    $script:socket = [System.Net.WebSockets.ClientWebSocket]::new()
    $script:socket.ConnectAsync([Uri]$pageTarget.webSocketDebuggerUrl, [Threading.CancellationToken]::None).GetAwaiter().GetResult() | Out-Null
    Invoke-Cdp -Method 'Page.enable' | Out-Null
    Invoke-Cdp -Method 'Runtime.enable' | Out-Null
    Invoke-Cdp -Method 'Emulation.setDeviceMetricsOverride' -Params @{
        width = $ViewportWidth
        height = $ViewportHeight
        deviceScaleFactor = 1
        mobile = $true
        screenWidth = $ViewportWidth
        screenHeight = $ViewportHeight
    } | Out-Null
    Invoke-Cdp -Method 'Page.navigate' -Params @{ url = $Url } | Out-Null

    $ready = $false
    for ($attempt = 0; $attempt -lt 80 -and -not $ready; $attempt += 1) {
        Start-Sleep -Milliseconds 100
        $ready = Invoke-PageScript -Expression 'document.readyState === "complete" && Boolean(window.LucioGame)'
    }
    Assert-True $ready 'juego carga todos sus modulos'
    Assert-Equal (Invoke-PageScript -Expression 'document.title') 'Lucio Lootbox Clicker' 'index es el juego real'
    Assert-True (Invoke-PageScript -Expression 'document.documentElement.scrollWidth <= window.innerWidth') 'sin overflow horizontal inicial'
    Assert-Equal (Invoke-PageScript -Expression 'GameState.getMantecas()') 0 'saldo inicial'
    Assert-Equal (Invoke-PageScript -Expression 'GameState.getTapValue()') 1 'produccion inicial'
    Assert-Equal (Invoke-PageScript -Expression 'Object.keys(GameState.getCounts()).length') 12 'doce variantes persistentes'
    Assert-True (Invoke-PageScript -Expression 'document.querySelector("[data-view=\"tap\"]").hidden === false') 'vista Tap inicial'

    $audioAssets = Invoke-PageScript -Expression 'Promise.all(["popsound.ogg","tapsound.ogg","openbackpacksound.ogg","backpackshake.mp3","lucioprizerevealsfx.ogg","betterlucioprizerevealsfx.ogg","evenbetterlucioprizerevealsfx.ogg","shinysfx.mp3"].map(async file=>{const response=await fetch(`assets/audio/${file}`);return response.ok&&(await response.arrayBuffer()).byteLength>0}))'
    Assert-Equal (@($audioAssets | Where-Object { $_ -eq $true }).Count) 8 'ocho audios disponibles'

    $uiTapIsolation = Invoke-PageScript -Expression '(()=>{const before=GameState.getMantecas();document.querySelector("[data-open-settings]").click();document.querySelector("[data-settings-dialog]").close();return GameState.getMantecas()===before})()'
    Assert-True $uiTapIsolation 'los controles UI no generan Mantecas'

    $tapResult = Invoke-PageScript -Expression '(()=>{document.querySelector("[data-tap-zone]").click();return {mantecas:GameState.getMantecas(),taps:GameState.getStats().totalTaps,pop:Boolean(document.querySelector(".tap-pop"))}})()'
    Assert-Equal $tapResult.mantecas 1 'tap suma exactamente el valor derivado'
    Assert-Equal $tapResult.taps 1 'tap incrementa estadistica'
    Assert-True $tapResult.pop 'tap crea feedback visual'

    if ($TapScreenshotPath) { Save-CdpScreenshot -Path $TapScreenshotPath }

    $imported = Invoke-PageScript -Expression '(()=>{const save=LucioSave.createDefault();save.mantecas=100;GameState.importSnapshot(save);LucioGame.navigate("shop",{focus:false});return {mantecas:GameState.getMantecas(),normalDisabled:document.querySelector("[data-buy-backpack=\"normal\"]").disabled,megaDisabled:document.querySelector("[data-buy-backpack=\"mega\"]").disabled}})()'
    Assert-Equal $imported.mantecas 100 'saldo de prueba importado'
    Assert-Equal $imported.normalDisabled $false 'Mochila Normal comprable'
    Assert-Equal $imported.megaDisabled $true 'Mochila Mega comunica saldo insuficiente'
    $insufficient = Invoke-PageScript -Expression 'GameState.purchaseBackpack("mega",{material:"cosmic",shiny:true})'
    Assert-Equal $insufficient.reason 'insufficient-mantecas' 'compra insuficiente rechazada'
    Assert-Equal (Invoke-PageScript -Expression 'GameState.getMantecas()') 100 'compra rechazada no altera saldo'

    if ($ShopScreenshotPath) { Save-CdpScreenshot -Path $ShopScreenshotPath }

    $purchase = Invoke-PageScript -Expression '(()=>{const values=[0.93,0.01];Math.random=()=>values.shift()??0.5;document.querySelector("[data-buy-backpack=\"normal\"]").click();LucioGame.buyBackpack("normal");return {mantecas:GameState.getMantecas(),count:GameState.getCount("rubyShiny"),tapValue:GameState.getTapValue(),reward:LucioGame.purchasedReward,overlay:!document.querySelector("[data-opening-overlay]").hidden,state:LucioGame.opening.state}})()'
    Assert-Equal $purchase.mantecas 50 'compra descuenta una vez y bloquea reentrada'
    Assert-Equal $purchase.count 1 'reward se concede una vez antes de animar'
    Assert-Equal $purchase.tapValue 41 'Shiny usa bonus independiente configurado'
    Assert-Equal $purchase.reward.material 'ruby' 'material sorteado antes del reveal'
    Assert-Equal $purchase.reward.shiny $true 'tirada Shiny independiente'
    Assert-True $purchase.overlay 'modal de apertura bloquea el juego'
    Assert-Equal $purchase.state 'entering' 'apertura comienza en entrada'
    Assert-True (Invoke-PageScript -Expression 'document.querySelector("[data-game-app]").inert') 'juego de fondo queda inerte'

    $openingState = Invoke-PageScript -Expression '(()=>{const stage=document.querySelector("[data-opening-stage]");stage.dispatchEvent(new PointerEvent("pointerdown",{bubbles:true,cancelable:true}));for(let i=0;i<3;i++)stage.dispatchEvent(new PointerEvent("pointerdown",{bubbles:true,cancelable:true}));return stage.dataset.state})()'
    Assert-Equal $openingState 'opening' 'tres taps abren la mochila'
    $revealState = Invoke-PageScript -Expression '(()=>{const stage=document.querySelector("[data-opening-stage]");stage.dispatchEvent(new PointerEvent("pointerdown",{bubbles:true,cancelable:true}));return {state:stage.dataset.state,mystery:document.querySelector(".reward-layer--mystery .lucio-sprite").src.includes("LucioMistery.png"),swapped:document.querySelector("[data-reward-slot]").classList.contains("is-swapped")}})()'
    Assert-Equal $revealState.state 'revealing' 'skip de apertura entra al reveal'
    Assert-True $revealState.mystery 'Mistery aparece primero'
    Assert-Equal $revealState.swapped $false 'drop real sigue oculto al inicio del reveal'

    if ($OpeningScreenshotPath) { Save-CdpScreenshot -Path $OpeningScreenshotPath }

    $rewardState = Invoke-PageScript -Expression '(()=>{const stage=document.querySelector("[data-opening-stage]");stage.dispatchEvent(new PointerEvent("pointerdown",{bubbles:true,cancelable:true}));const sprite=document.querySelector(".reward-layer--actual .lucio-sprite");const name=document.querySelector("[data-reward-name]").textContent;return {state:stage.dataset.state,swapped:document.querySelector("[data-reward-slot]").classList.contains("is-swapped"),ruby:sprite.src.includes("LucioRuby.png"),width:sprite.naturalWidth,nameCorrect:name===`Lucio ${GAME_CONFIG.lucios.rubyShiny.label}`,confirmVisible:getComputedStyle(document.querySelector("[data-confirm-wrap]")).display!=="none"}})()'
    Assert-Equal $rewardState.state 'reward-visible' 'skip completa reveal'
    Assert-True $rewardState.swapped 'Mistery cambia por el drop real'
    Assert-True $rewardState.ruby 'Rubí usa su sprite correcto'
    Assert-Equal $rewardState.width 1024 'sprite Rubí cargado'
    Assert-True $rewardState.nameCorrect 'nombre del reward correcto'
    Assert-True $rewardState.confirmVisible 'confirmacion obligatoria visible'
    Assert-True (Invoke-PageScript -Expression '(()=>{const copy=document.querySelector("[data-reward-copy]").getBoundingClientRect();const confirm=document.querySelector("[data-confirm]").getBoundingClientRect();return copy.bottom + 4 <= confirm.top && confirm.bottom <= innerHeight})()') 'nombre, bonus y Confirmar no se solapan en el viewport'
    Assert-Equal (Invoke-PageScript -Expression '(()=>{const stage=document.querySelector("[data-opening-stage]");stage.dispatchEvent(new PointerEvent("pointerdown",{bubbles:true,cancelable:true}));return stage.dataset.state})()') 'reward-visible' 'tap de fondo no cierra reward'

    if ($RewardScreenshotPath) {
        Invoke-PageScript -Expression 'new Promise(resolve=>setTimeout(resolve,620))' | Out-Null
        Save-CdpScreenshot -Path $RewardScreenshotPath
    }

    $confirmed = Invoke-PageScript -Expression '(()=>{document.querySelector("[data-confirm]").click();return {overlay:document.querySelector("[data-opening-overlay]").hidden,inert:document.querySelector("[data-game-app]").inert,count:GameState.getCount("rubyShiny"),state:LucioGame.opening.state,focusRestored:document.activeElement.matches("[data-buy-backpack], [data-nav=\"shop\"]")}})()'
    Assert-True $confirmed.overlay 'confirmar cierra apertura'
    Assert-Equal $confirmed.inert $false 'confirmar reactiva el juego'
    Assert-Equal $confirmed.count 1 'confirmar no duplica reward'
    Assert-Equal $confirmed.state 'idle' 'secuencia vuelve a idle'
    Assert-True $confirmed.focusRestored 'confirmar restaura el foco fuera del modal'

    $collection = Invoke-PageScript -Expression '(()=>{LucioGame.navigate("collection",{focus:false});return new Promise(resolve=>requestAnimationFrame(()=>resolve({variants:Array.from(document.querySelectorAll(".collection-category")).map(node=>node.dataset.variant),empty:document.querySelector("[data-collection-empty]").hidden})))})()'
    Assert-Equal $collection.variants.Count 1 'solo existe categoria descubierta'
    Assert-Equal $collection.variants[0] 'rubyShiny' 'categoria Shiny correcta'
    Assert-True $collection.empty 'estado vacio oculto tras descubrir'

    $largeCollection = Invoke-PageScript -Expression '(()=>{const save=LucioSave.createDefault();save.mantecas=123;save.counts.bronze=25;save.counts.cosmic=1;save.counts.silverShiny=2;GameState.importSnapshot(save);return new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>{const bronze=document.querySelector("[data-variant=\"bronze\"]");const copies=bronze.querySelectorAll(".collection-lucio");resolve({order:Array.from(document.querySelectorAll(".collection-category")).map(node=>node.dataset.variant),tapValue:GameState.getTapValue(),copies:copies.length,more:!bronze.querySelector(".collection-category__more").hidden,lastOpacity:Number(copies[copies.length-1].style.opacity)});})))})()'
    Assert-Equal ($largeCollection.order -join ',') 'bronze,cosmic,silverShiny' 'orden fijo normales antes de Shiny'
    Assert-Equal $largeCollection.tapValue 122 'tapValue recalculado desde coleccion'
    Assert-Equal $largeCollection.copies 18 'coleccion limita nodos visibles'
    Assert-True $largeCollection.more 'coleccion grande muestra ellipsis'
    Assert-True ($largeCollection.lastOpacity -lt 0.2) 'coleccion grande aplica fade'

    if ($CollectionScreenshotPath) { Save-CdpScreenshot -Path $CollectionScreenshotPath }

    Invoke-Cdp -Method 'Page.reload' -Params @{ ignoreCache = $true } | Out-Null
    $reloaded = $false
    for ($attempt = 0; $attempt -lt 80 -and -not $reloaded; $attempt += 1) {
        Start-Sleep -Milliseconds 100
        $reloaded = Invoke-PageScript -Expression 'document.readyState === "complete" && Boolean(window.LucioGame) && GameState.getMantecas() === 123'
    }
    Assert-True $reloaded 'save sobrevive recarga'
    Assert-Equal (Invoke-PageScript -Expression 'GameState.getCount("bronze")') 25 'duplicados persisten'
    Assert-Equal (Invoke-PageScript -Expression 'GameState.getTapValue()') 122 'produccion derivada persiste sin guardarse'

    $reset = Invoke-PageScript -Expression '(()=>{window.confirm=()=>true;document.querySelector("[data-open-settings]").click();document.querySelector("[data-reset-progress]").click();return {mantecas:GameState.getMantecas(),total:Object.values(GameState.getCounts()).reduce((sum,count)=>sum+count,0),stored:localStorage.getItem(LucioSave.key)}})()'
    Assert-Equal $reset.mantecas 0 'reset borra Mantecas'
    Assert-Equal $reset.total 0 'reset borra coleccion'
    Assert-Equal $reset.stored $null 'reset elimina save persistente'

    $exceptions = @($script:browserEvents | Where-Object { $_.method -eq 'Runtime.exceptionThrown' })
    Assert-Equal $exceptions.Count 0 'sin excepciones de runtime'
} finally {
    if ($socket) { $socket.Dispose() }
    if ($browserProcess -and -not $browserProcess.HasExited) { Stop-Process -Id $browserProcess.Id -Force -ErrorAction SilentlyContinue }
    if (Test-Path -LiteralPath $testProfile) { Remove-Item -LiteralPath $testProfile -Recurse -Force -ErrorAction SilentlyContinue }
}
