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

    $touchHover = Invoke-PageScript -Expression 'new Promise(resolve=>setTimeout(()=>{const copies=document.querySelectorAll("[data-variant=bronze] .collection-lucio");const first=copies[0].getBoundingClientRect();const second=copies[1].getBoundingClientRect();const pointerId=7;copies[0].dispatchEvent(new PointerEvent("pointerdown",{bubbles:true,pointerType:"touch",pointerId,clientX:first.left+1,clientY:first.top+20}));const firstLifted=copies[0].classList.contains("is-lifted");copies[0].dispatchEvent(new PointerEvent("pointermove",{bubbles:true,pointerType:"touch",pointerId,clientX:second.left+1,clientY:second.top+20}));const followed=copies[1].classList.contains("is-lifted")&&!copies[0].classList.contains("is-lifted");copies[0].dispatchEvent(new PointerEvent("pointerup",{bubbles:true,pointerType:"touch",pointerId,clientX:second.left+1,clientY:second.top+20}));resolve({firstLifted,followed,released:!document.querySelector(".collection-lucio.is-lifted")})},220))'
    Assert-True $touchHover.firstLifted 'mantener el dedo levanta un Lucio'
    Assert-True $touchHover.followed 'deslizar el dedo mueve el hover entre Lucios'
    Assert-True $touchHover.released 'soltar el dedo baja el Lucio'

    if ($CollectionScreenshotPath) { Save-CdpScreenshot -Path $CollectionScreenshotPath }

    # -------------------------------------------------------------
    # Ambu flow: Discovery -> Egg -> Hatching -> Baby -> Production
    # -------------------------------------------------------------
    $ambuLocked = Invoke-PageScript -Expression '(()=>{LucioGame.navigate("ambu",{focus:false});return {stage:GameState.getAmbu().stage,btnHidden:document.querySelector("[data-open-ambu]").hidden,activeView:LucioGame.activeView,passiveActive:GameState.getPassiveRate().active,rateHidden:document.querySelector("[data-passive-rate]").hidden,bankHidden:document.querySelector("[data-offline-bank]").hidden}})()'
    Assert-Equal $ambuLocked.stage 'locked' 'Ambu inicial bloqueado'
    Assert-True $ambuLocked.btnHidden 'boton de Ambu oculto cuando bloqueado'
    Assert-Equal $ambuLocked.activeView 'tap' 'navegacion a Ambu bloqueada redirige a tap'
    Assert-Equal $ambuLocked.passiveActive $false 'tasa pasiva inactiva cuando bloqueado'
    Assert-True $ambuLocked.rateHidden 'UI de tasa pasiva oculta cuando bloqueado'
    Assert-True $ambuLocked.bankHidden 'UI de banco offline oculta cuando bloqueado'

    # Discovery at 50,000 historical Mantecas earned (even if balance is 0 because of spent mantecas)
    $ambuDiscovered = Invoke-PageScript -Expression '(()=>{const save=LucioSave.createDefault();save.mantecas=0;save.stats.totalMantecasEarned=50000;save.stats.totalMantecasSpent=50000;GameState.importSnapshot(save);return {stage:GameState.getAmbu().stage,btnHidden:document.querySelector("[data-open-ambu]").hidden}})()'
    Assert-Equal $ambuDiscovered.stage 'egg' 'alcanzar 50k mantecas producidas historicamente descubre el huevo de Ambu'
    Assert-Equal $ambuDiscovered.btnHidden $false 'boton de Ambu visible tras descubrimiento'

    # Navigate to Ambu and purchase egg
    $ambuEggView = Invoke-PageScript -Expression '(()=>{LucioGame.navigate("ambu",{focus:false});return {activeView:LucioGame.activeView,buyPrice:document.querySelector("[data-buy-ambu]").textContent.includes("250.000"),characterStage:document.querySelector("[data-ambu-stage]").dataset.stage}})()'
    Assert-Equal $ambuEggView.activeView 'ambu' 'navegacion a pestaña Ambu funciona tras descubrimiento'
    Assert-True $ambuEggView.buyPrice 'boton comprar huevo indica 250.000 Mantecas'
    Assert-Equal $ambuEggView.characterStage 'egg' 'personaje muestra visual de huevo'

    # Cannot hatch without 250k
    $buyFail = Invoke-PageScript -Expression 'GameState.purchaseAmbuEgg()'
    Assert-Equal $buyFail.reason 'insufficient-mantecas' 'compra de huevo rechazada con saldo insuficiente'

    # Grant 250k and hatch
    $hatchStart = Invoke-PageScript -Expression '(()=>{const save=LucioSave.createDefault();save.mantecas=250000;save.ambu.stage="egg";GameState.importSnapshot(save);document.querySelector("[data-buy-ambu]").click();return {stage:GameState.getAmbu().stage,mantecas:GameState.getMantecas(),hatchTaps:GameState.getAmbu().hatchTaps,purchaseHidden:document.querySelector("[data-ambu-purchase]").hidden}})()'
    Assert-Equal $hatchStart.stage 'hatching' 'comprar huevo cambia estado a hatching'
    Assert-Equal $hatchStart.mantecas 0 'compra de huevo descuenta 250.000 mantecas'
    Assert-Equal $hatchStart.hatchTaps 0 'hatchTaps inicia en 0'
    Assert-True $hatchStart.purchaseHidden 'tarjeta de compra se oculta durante eclosion'

    # Perform 15 hatch taps and await birth
    $hatchComplete = Invoke-PageScript -Expression 'new Promise(resolve => { const char = document.querySelector("[data-ambu-character]"); for(let i = 0; i < 15; i++) char.click(); setTimeout(() => { const toastText = document.querySelector("[data-game-toast]")?.textContent || ""; const hasBirthToast = toastText.includes("NUEVO") && toastText.includes("Ambu") && toastText.includes("unido"); resolve({ stage: GameState.getAmbu().stage, hatchedAt: GameState.getAmbu().hatchedAt > 0, lastActive: GameState.getAmbu().lastActiveTimestamp > 0, passive: GameState.getPassiveRate(), hasBirthToast }); }, 1650); })'
    Assert-Equal $hatchComplete.stage 'baby' '15 taps eclosionan a Ambu bebe'
    Assert-True $hatchComplete.hasBirthToast 'notificacion de bienvenida se muestra al eclosionar Ambu bebe'
    Assert-True $hatchComplete.hatchedAt 'hatchedAt registrado'
    Assert-True $hatchComplete.lastActive 'lastActiveTimestamp inicializado'
    Assert-Equal $hatchComplete.passive.active $true 'produccion pasiva activa para bebe'
    Assert-Equal $hatchComplete.passive.intervalMs 1000 'intervalo de pulso de 1000ms'
    Assert-Equal $hatchComplete.passive.ratePerSecond 1 'tasa pasiva inicial es 1 manteca/s'
    Assert-Equal $hatchComplete.passive.offlineCapHours 3 'limite de banco offline es 3 horas'
    Assert-Equal $hatchComplete.passive.offlineCapacity 10800 'capacidad offline es 1*3*3600=10800'

    # Check Ambu view for Baby Ambu (Rate card, Info button, and Info modal)
    $babyAmbuView = Invoke-PageScript -Expression '(()=>{LucioGame.navigate("ambu",{focus:false});const infoBtnHidden=document.querySelector("[data-open-ambu-info]").hidden;const rateCardHidden=document.querySelector("[data-ambu-rate-card]").hidden;const rateCardText=document.querySelector("[data-ambu-rate-card] strong")?.textContent||"";const hasRateText=rateCardText.includes("1 Tap /s")&&rateCardText.includes("(1")&&rateCardText.includes("/s");document.querySelector("[data-open-ambu-info]").click();const infoModalOpen=document.querySelector("[data-ambu-info-dialog]").hasAttribute("open");const infoLore=document.querySelector("[data-ambu-info-lore]").textContent;document.querySelector("[data-close-ambu-info]").click();const infoModalClosed=!document.querySelector("[data-ambu-info-dialog]").hasAttribute("open");const closedEyesSrc=GAME_CONFIG.ambu.sprites.babyClosed;return {infoBtnHidden,rateCardHidden,hasRateText,infoModalOpen,hasLore:infoLore.includes("hambriento"),infoModalClosed,closedEyesSrc};})()'
    Assert-Equal $babyAmbuView.infoBtnHidden $false 'boton de informacion visible para Ambu bebe'
    Assert-Equal $babyAmbuView.rateCardHidden $false 'caja de tasa pasiva visible en vista de Ambu bebe'
    Assert-True $babyAmbuView.hasRateText 'caja de tasa pasiva muestra 1 Tap /s (1 🧈/s)'
    Assert-True $babyAmbuView.infoModalOpen 'pulsar boton de info abre el popup modal'
    Assert-True $babyAmbuView.hasLore 'popup modal contiene la descripcion exacta de Ambu bebe'
    Assert-True $babyAmbuView.infoModalClosed 'cerrar popup modal oculta el dialogo'
    Assert-Equal $babyAmbuView.closedEyesSrc 'assets/invocados/Ambu_2_closedEyes.png' 'sprite de ojos cerrados configurado'

    # Natural Blinking Verification
    $blinkTest = Invoke-PageScript -Expression 'new Promise(resolve => {
        LucioGame.navigate("ambu",{focus:false});
        const sprite = document.querySelector("[data-ambu-sprite]");
        const backdrop = document.querySelector("[data-tap-ambu-backdrop] img");
        let sawClosedEyes = false;
        let sawBackdropClosed = false;
        let restoredOpenEyes = false;
        
        const checkInterval = setInterval(() => {
            if (sprite && sprite.src.includes("closedEyes")) {
                sawClosedEyes = true;
                if (backdrop && backdrop.src.includes("closedEyes")) {
                    sawBackdropClosed = true;
                }
            } else if (sawClosedEyes && sprite && sprite.src.includes("Ambu_2.png")) {
                restoredOpenEyes = true;
                clearInterval(checkInterval);
                resolve({ sawClosedEyes, sawBackdropClosed, restoredOpenEyes });
            }
        }, 20);
        
        setTimeout(() => {
            clearInterval(checkInterval);
            resolve({ sawClosedEyes, sawBackdropClosed, restoredOpenEyes });
        }, 6000);
    })'
    Assert-True $blinkTest.sawClosedEyes 'Ambu cierra los ojos durante el ciclo de parpadeo'
    Assert-True $blinkTest.sawBackdropClosed 'Ambu en fondo de Tap tambien cierra los ojos al parpadear'
    Assert-True $blinkTest.restoredOpenEyes 'Ambu abre los ojos tras parpadear'

    # Check Tap UI for Baby Ambu
    $babyTapUi = Invoke-PageScript -Expression '(()=>{LucioGame.navigate("tap",{focus:false});return {rateHidden:document.querySelector("[data-passive-rate]").hidden,rateText:document.querySelector("[data-passive-per-second]").textContent,bankHidden:document.querySelector("[data-offline-bank]").hidden,stored:document.querySelector("[data-offline-stored]").textContent,capacity:document.querySelector("[data-offline-capacity]").textContent,hours:document.querySelector("[data-offline-hours]").textContent,collectHidden:document.querySelector("[data-collect-offline]").hidden}})()'
    Assert-Equal $babyTapUi.rateHidden $false 'tasa pasiva visible en Tap para Ambu bebe'
    Assert-Equal $babyTapUi.rateText '1' 'tasa pasiva muestra 1 🧈/s'
    Assert-Equal $babyTapUi.bankHidden $false 'banco offline visible en Tap'
    Assert-Equal $babyTapUi.stored '0' 'almacenado offline inicial es 0'
    Assert-Equal $babyTapUi.capacity '10.800' 'capacidad offline muestra 10.800'
    Assert-Equal $babyTapUi.hours '3' 'horas de produccion muestra 3'
    Assert-True $babyTapUi.collectHidden 'boton recoger oculto con saldo 0'

    # Recalculation of passive rate when tap value changes
    $rateUpdate = Invoke-PageScript -Expression '(()=>{const save=GameState.getSnapshot();save.counts.bronze=9;GameState.importSnapshot(save);return {tapValue:GameState.getTapValue(),passive:GameState.getPassiveRate(),rateText:document.querySelector("[data-passive-per-second]").textContent,capacityText:document.querySelector("[data-offline-capacity]").textContent,ambuRateText:document.querySelector("[data-ambu-rate-value]").textContent}})()'
    Assert-Equal $rateUpdate.tapValue 10 'tapValue es 10 con 9 bronces'
    Assert-Equal $rateUpdate.passive.ratePerSecond 10 'tasa pasiva recalculada centralizadamente a 10 🧈/s'
    Assert-Equal $rateUpdate.passive.offlineCapacity 108000 'capacidad offline recalculada a 108.000'
    Assert-Equal $rateUpdate.rateText '10' 'UI de tasa pasiva muestra 10'
    Assert-Equal $rateUpdate.capacityText '108.000' 'UI de capacidad offline muestra 108.000'
    Assert-Equal $rateUpdate.ambuRateText '10' 'UI de Ambu rate card actualiza a 10 🧈/s'

    # Online tick accumulation
    $onlineTick = Invoke-PageScript -Expression '(()=>{const now=Date.now();const before=GameState.getMantecas();GameState.tickOnline(1000,now);return {gained:GameState.getMantecas()-before,stored:GameState.getAmbu().offlineStored}})()'
    Assert-Equal $onlineTick.gained 10 'tick online de 1000ms acumula 10 mantecas directamente a saldo'
    Assert-Equal $onlineTick.stored 0 'tick online no altera banco offline'

    # Offline catchup accumulation (1 hour = 3600s * 10 🧈/s = 36,000)
    $offline1h = Invoke-PageScript -Expression '(()=>{const now=Date.now();const save=GameState.getSnapshot();save.ambu.lastActiveTimestamp=now-3600000;GameState.importSnapshot(save);const catchup=GameState.resolveOfflineCatchup(now);return {catchup,stored:GameState.getAmbu().offlineStored,collectHidden:document.querySelector("[data-collect-offline]").hidden,storedText:document.querySelector("[data-offline-stored]").textContent}})()'
    Assert-Equal $offline1h.stored 36000 '1 hora offline acumula 36.000 mantecas en banco offline'
    Assert-Equal $offline1h.collectHidden $false 'boton recoger visible con saldo offline > 0'
    Assert-Equal $offline1h.storedText '36.000' 'texto almacenado muestra 36.000'

    # Offline cap limit (5 hours offline should cap at 3 hours = 108,000)
    $offlineCap = Invoke-PageScript -Expression '(()=>{const now=Date.now();const save=GameState.getSnapshot();save.ambu.lastActiveTimestamp=now-18000000;GameState.importSnapshot(save);GameState.resolveOfflineCatchup(now);return {stored:GameState.getAmbu().offlineStored,cap:GameState.getPassiveRate().offlineCapacity}})()'
    Assert-Equal $offlineCap.stored 108000 'produccion offline limitada estrictamente a tope de 3 horas (108.000)'

    # Manual collection via button
    $collected = Invoke-PageScript -Expression '(()=>{const beforeMantecas=GameState.getMantecas();document.querySelector("[data-collect-offline]").click();return {before:beforeMantecas,after:GameState.getMantecas(),stored:GameState.getAmbu().offlineStored,collectHidden:document.querySelector("[data-collect-offline]").hidden}})()'
    Assert-Equal $collected.after ($collected.before + 108000) 'recoger transfiere la totalidad del banco offline a Mantecas'
    Assert-Equal $collected.stored 0 'banco offline queda en 0 tras recoger'
    Assert-True $collected.collectHidden 'boton recoger vuelve a ocultarse tras recoger'

    # Anti-cheat: Clock Rollback detection and Time Debt
    $antiCheat = Invoke-PageScript -Expression '(()=>{const save=GameState.getSnapshot();save.ambu.lastActiveTimestamp=Date.now();save.ambu.timeDebtMs=0;save.ambu.offlineStored=0;GameState.importSnapshot(save);const actualLast=GameState.getAmbu().lastActiveTimestamp;const rollback=GameState.resolveOfflineCatchup(actualLast-600000);const debt1=GameState.getAmbu().timeDebtMs;const stored1=GameState.getAmbu().offlineStored;const payPartial=GameState.resolveOfflineCatchup(actualLast-600000+240000);const debt2=GameState.getAmbu().timeDebtMs;const stored2=GameState.getAmbu().offlineStored;const clearDebt=GameState.resolveOfflineCatchup(actualLast-600000+240000+600000);const debt3=GameState.getAmbu().timeDebtMs;const stored3=GameState.getAmbu().offlineStored;return {debt1,stored1,debt2,stored2,debt3,stored3}})()'
    Assert-Equal $antiCheat.debt1 600000 'retroceso de reloj de 10 min genera deuda temporal de 600.000ms'
    Assert-Equal $antiCheat.stored1 0 'retroceso no genera produccion offline'
    Assert-Equal $antiCheat.debt2 360000 'tiempo posterior amortiza deuda a 360.000ms'
    Assert-Equal $antiCheat.stored2 0 'mientras haya deuda no se genera produccion offline'
    Assert-Equal $antiCheat.debt3 0 'deuda completamente saldada'
    Assert-Equal $antiCheat.stored3 2400 'remanente de tiempo tras saldar deuda produce mantecas offline normalmente'

    Invoke-Cdp -Method 'Page.reload' -Params @{ ignoreCache = $true } | Out-Null
    $reloaded = $false
    for ($attempt = 0; $attempt -lt 80 -and -not $reloaded; $attempt += 1) {
        Start-Sleep -Milliseconds 100
        $reloaded = Invoke-PageScript -Expression 'document.readyState === "complete" && Boolean(window.LucioGame) && GameState.getMantecas() > 0'
    }
    Assert-True $reloaded 'save sobrevive recarga'
    Assert-Equal (Invoke-PageScript -Expression 'GameState.getAmbu().stage') 'baby' 'etapa baby de Ambu persiste tras recarga'
    Assert-Equal (Invoke-PageScript -Expression 'GameState.getPassiveRate().active') $true 'tasa pasiva activa persiste tras recarga'

    $reset = Invoke-PageScript -Expression '(()=>{window.confirm=()=>true;document.querySelector("[data-open-settings]").click();document.querySelector("[data-reset-progress]").click();return {mantecas:GameState.getMantecas(),total:Object.values(GameState.getCounts()).reduce((sum,count)=>sum+count,0),stage:GameState.getAmbu().stage,stored:localStorage.getItem(LucioSave.key)}})()'
    Assert-Equal $reset.mantecas 0 'reset borra Mantecas'
    Assert-Equal $reset.total 0 'reset borra coleccion'
    Assert-Equal $reset.stage 'locked' 'reset bloquea a Ambu'
    Assert-Equal $reset.stored $null 'reset elimina save persistente'

    # -------------------------------------------------------------
    # Playground.html Ambu Section Verification
    # -------------------------------------------------------------
    Invoke-Cdp -Method 'Page.navigate' -Params @{ url = 'http://localhost:8765/playground.html' } | Out-Null
    $playgroundLoaded = $false
    for ($attempt = 0; $attempt -lt 80 -and -not $playgroundLoaded; $attempt += 1) {
        Start-Sleep -Milliseconds 100
        $playgroundLoaded = Invoke-PageScript -Expression 'document.readyState === "complete" && Boolean(window.AmbuRenderer) && Boolean(document.querySelector("[data-ambu-playground-root]"))'
    }
    Assert-True $playgroundLoaded 'playground.html carga correctamente con AmbuRenderer y seccion 03'

    $playgroundAmbu = Invoke-PageScript -Expression '(()=>{
        const root = document.querySelector("[data-ambu-playground-root]");
        const sprite = root.querySelector("[data-ambu-sprite]");
        const status = root.querySelector("[data-ambu-status-readout]");
        const holdBtn = root.querySelector("[data-ambu-hold-toggle]");
        
        // Test hold toggle
        holdBtn.click();
        const heldClosed = sprite.src.includes("closedEyes");
        const heldStatus = status.textContent;
        
        // Release hold
        holdBtn.click();
        const releasedOpen = sprite.src.includes("Ambu_2.png");
        
        // Test stage select to egg
        const stageSelect = root.querySelector("[data-ambu-stage-select]");
        stageSelect.value = "egg";
        stageSelect.dispatchEvent(new Event("change"));
        const eggSrc = sprite.src.includes("Ambu_1.png");
        
        // Return to baby
        stageSelect.value = "baby";
        stageSelect.dispatchEvent(new Event("change"));
        const backToBaby = sprite.src.includes("Ambu_2.png");
        
        return { heldClosed, heldStatus, releasedOpen, eggSrc, backToBaby };
    })()'

    Assert-True $playgroundAmbu.heldClosed 'Playground: Mantener ojos cerrados cambia sprite a closedEyes'
    Assert-True $playgroundAmbu.releasedOpen 'Playground: Liberar ojos restaura sprite a Ambu_2'
    Assert-True $playgroundAmbu.eggSrc 'Playground: Selector de etapa cambia a visual de huevo'
    Assert-True $playgroundAmbu.backToBaby 'Playground: Selector de etapa vuelve a Ambu bebe'

    $exceptions = @($script:browserEvents | Where-Object { $_.method -eq 'Runtime.exceptionThrown' })
    Assert-Equal $exceptions.Count 0 'sin excepciones de runtime'
} finally {
    if ($socket) { $socket.Dispose() }
    if ($browserProcess -and -not $browserProcess.HasExited) { Stop-Process -Id $browserProcess.Id -Force -ErrorAction SilentlyContinue }
    if (Test-Path -LiteralPath $testProfile) { Remove-Item -LiteralPath $testProfile -Recurse -Force -ErrorAction SilentlyContinue }
}
