' =====================================================================
' BUNKER POS - INICIADOR Y CONFIGURADOR MAESTRO (TODO EN UNO)
' Ubicacion: printer-server\INICIAR_BUNKER_POS.vbs
' =====================================================================
Set WshShell = CreateObject("WScript.Shell")
Set objFSO = CreateObject("Scripting.FileSystemObject")

strPath = WScript.ScriptFullName
serverDir = objFSO.GetParentFolderName(strPath)
WshShell.CurrentDirectory = serverDir

' Asegurar Node.js en el PATH del proceso
WshShell.Environment("Process")("PATH") = WshShell.Environment("Process")("PATH") & ";C:\Program Files\nodejs;C:\Program Files (x86)\nodejs;" & WshShell.ExpandEnvironmentStrings("%APPDATA%\npm")

Dim stationName, isSilent, autoStart
stationName = "Caja"
isSilent = false
autoStart = "0"

' Detectar argumentos si viene desde el Inicio Automatico de Windows
If WScript.Arguments.Count > 0 Then
    stationName = Trim(WScript.Arguments(0))
End If
If WScript.Arguments.Count > 1 Then
    If LCase(Trim(WScript.Arguments(1))) = "silent" Then isSilent = true
End If

' Si se ejecuta manualmente (sin silent), mostrar ventana interactiva
If Not isSilent Then
    selectorScript = serverDir & "\selector.ps1"
    If Not objFSO.FileExists(selectorScript) Then
        MsgBox "No se encontro selector.ps1 en: " & serverDir, 16, "Bunker POS"
        WScript.Quit
    End If

    tempFile = WshShell.ExpandEnvironmentStrings("%TEMP%\bunker_gui_res.txt")
    If objFSO.FileExists(tempFile) Then
        On Error Resume Next
        objFSO.DeleteFile(tempFile)
        On Error GoTo 0
    End If

    psCmd = "powershell.exe -WindowStyle Hidden -NoProfile -ExecutionPolicy Bypass -File """ & selectorScript & """"
    WshShell.Run psCmd, 0, true

    guiOutput = ""
    If objFSO.FileExists(tempFile) Then
        On Error Resume Next
        Set f = objFSO.OpenTextFile(tempFile, 1)
        If Not f.AtEndOfStream Then guiOutput = Trim(f.ReadAll())
        f.Close
        objFSO.DeleteFile(tempFile)
        On Error GoTo 0
    End If

    If InStr(guiOutput, "OK:") = 0 Then
        ' El usuario presiono Cancelar o cerro la ventana
        WScript.Quit
    End If

    cleanStr = Mid(guiOutput, InStr(guiOutput, "OK:"))
    parts = Split(cleanStr, ":")
    stationName = Trim(parts(1))
    autoStart = Trim(parts(2))

    ' Configurar Inicio Automatico con Windows (shell:startup)
    startupFolder = WshShell.SpecialFolders("Startup")
    shortcutPath = startupFolder & "\BunkerPOS.lnk"

    If autoStart = "1" Then
        Set oShortcut = WshShell.CreateShortcut(shortcutPath)
        oShortcut.TargetPath = "wscript.exe"
        oShortcut.Arguments = """" & strPath & """ " & stationName & " silent"
        oShortcut.WorkingDirectory = serverDir
        oShortcut.WindowStyle = 7 ' Minimized
        oShortcut.Description = "Servidor de Impresion Bunker POS"
        oShortcut.Save
    Else
        If objFSO.FileExists(shortcutPath) Then
            On Error Resume Next
            objFSO.DeleteFile(shortcutPath)
            On Error GoTo 0
        End If
    End If
End If

If stationName = "" Then stationName = "Caja"

' 1. Detener instancias anteriores de server.js y de la bandeja de forma limpia
stopScript = serverDir & "\stop_services.ps1"
If objFSO.FileExists(stopScript) Then
    WshShell.Run "powershell.exe -NoProfile -ExecutionPolicy Bypass -File """ & stopScript & """", 0, true
End If

' 2. Iniciar servidor Node.js con la estacion seleccionada (en segundo plano / oculto)
WshShell.Run "cmd.exe /c cd /d """ & serverDir & """ && node server.js " & stationName, 0, false

' 3. Iniciar Bandeja del Sistema (icono B en la barra de tareas)
trayPs1 = serverDir & "\BunkerTray.ps1"
If objFSO.FileExists(trayPs1) Then
    WshShell.Run "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & trayPs1 & """", 0, false
End If

WScript.Sleep 1200

' Notificacion de confirmacion en inicio manual
If Not isSilent Then
    autoText = "Desactivado"
    If autoStart = "1" Then autoText = "Activado (Inicia solo con Windows)"
    MsgBox "Servidor de Impresion Bunker POS iniciado correctamente." & vbCrLf & vbCrLf & _
           "- Estacion asignada: """ & stationName & """" & vbCrLf & _
           "- Icono en bandeja: Activo (letra B)" & vbCrLf & _
           "- Inicio con Windows: " & autoText & vbCrLf & vbCrLf & _
           "Listo para recibir ordenes de cobro y comandas.", 64, "Bunker POS - Estacion " & stationName
End If
