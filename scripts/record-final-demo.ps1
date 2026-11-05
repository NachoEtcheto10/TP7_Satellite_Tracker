param(
  [string]$Adb = 'C:\Users\lucan\AppData\Local\Android\Sdk\platform-tools\adb.exe'
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$work = Join-Path $root 'video-work'
New-Item -ItemType Directory -Force -Path $work | Out-Null

function Tap([int]$x, [int]$y) { & $Adb shell input tap $x $y | Out-Null }
function Swipe([int]$x1, [int]$y1, [int]$x2, [int]$y2, [int]$duration = 500) {
  & $Adb shell input swipe $x1 $y1 $x2 $y2 $duration | Out-Null
}
function Pause([int]$seconds) { Start-Sleep -Seconds $seconds }
function Start-Recording([string]$remote) {
  & $Adb shell rm -f $remote | Out-Null
  $arguments = @('shell', 'screenrecord', '--size', '1080x1920', '--bit-rate', '12000000', '--time-limit', '32', $remote)
  $process = Start-Process -FilePath $Adb -ArgumentList $arguments -WindowStyle Hidden -PassThru
  Pause 2
  return $process
}
function Finish-Recording($process, [string]$remote, [string]$local) {
  Wait-Process -Id $process.Id -Timeout 40
  & $Adb pull $remote $local | Out-Null
}

& $Adb shell pm grant ar.edu.uader.orbita android.permission.POST_NOTIFICATIONS | Out-Null
& $Adb emu geo fix -60.5238 -31.73197 77 | Out-Null
& $Adb shell am force-stop ar.edu.uader.orbita | Out-Null
& $Adb shell am start -W -n ar.edu.uader.orbita/.MainActivity | Out-Null
Pause 5

# Preparación fuera de cámara: lote Starlink real y observador GPS inyectado.
Tap 108 1835
Pause 3
Tap 540 1650
Pause 8
Tap 540 1835
Pause 3
Tap 540 1045
Pause 6
Tap 108 1835
Pause 3

# Escena 1: mapa, constelación y catálogo/búsqueda.
$scene1 = Start-Recording '/sdcard/orbita-final-1.mp4'
Pause 4
Swipe 820 720 320 720 650
Pause 4
Swipe 300 760 720 650 650
Pause 4
Tap 324 1835
Pause 4
Tap 500 405
& $Adb shell input text ISS | Out-Null
Pause 3
& $Adb shell input keyevent 4 | Out-Null
Pause 3
Finish-Recording $scene1 '/sdcard/orbita-final-1.mp4' (Join-Path $work 'final-scene-1.mp4')

# Escena 2: selección, mapa, pases, sky chart y brújula.
$scene2 = Start-Recording '/sdcard/orbita-final-2.mp4'
Tap 520 690
Pause 5
Tap 540 1835
Pause 7
Swipe 850 900 250 900 550
Pause 5
Tap 756 1835
Pause 7
Finish-Recording $scene2 '/sdcard/orbita-final-2.mp4' (Join-Path $work 'final-scene-2.mp4')

# Escena 3: GPS, umbrales, vigencia y validación independiente real.
$scene3 = Start-Recording '/sdcard/orbita-final-3.mp4'
Tap 972 1835
Pause 3
Swipe 540 600 540 1500 600
Pause 4
Tap 445 1150
Pause 2
Tap 270 1150
Pause 2
Swipe 540 1500 540 650 650
Pause 4
Tap 230 1475
Pause 7
Finish-Recording $scene3 '/sdcard/orbita-final-3.mp4' (Join-Path $work 'final-scene-3.mp4')

# Escena 4: resultado RF-15, notificación Android y cierre con Starlink.
$scene4 = Start-Recording '/sdcard/orbita-final-4.mp4'
Pause 4
Tap 540 1165
Pause 7
& $Adb shell cmd statusbar expand-notifications | Out-Null
Pause 6
& $Adb shell cmd statusbar collapse | Out-Null
Pause 3
Tap 108 1835
Pause 5
Swipe 800 700 360 760 600
Pause 3
Finish-Recording $scene4 '/sdcard/orbita-final-4.mp4' (Join-Path $work 'final-scene-4.mp4')

Write-Output 'RECORDING_COMPLETE'
