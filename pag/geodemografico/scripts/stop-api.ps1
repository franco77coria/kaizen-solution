# Detiene la API local por linea de comandos. En Windows `pkill` no alcanza.
Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
  Where-Object { $_.CommandLine -like '*apps/api/dist/server.js*' } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force; "detenido PID $($_.ProcessId)" }
