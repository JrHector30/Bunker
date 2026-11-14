' =====================================================================
' BÚNKER POS - INSTALADOR DE INICIO AUTOMÁTICO CON WINDOWS
' =====================================================================
Set WshShell = CreateObject("WScript.Shell")
Set objFSO = CreateObject("Scripting.FileSystemObject")

strPath = WScript.ScriptFullName
strFolder = objFSO.GetParentFolderName(strPath)

targetVbs = strFolder & "\INICIAR_BUNKER_POS.vbs"
If Not objFSO.FileExists(targetVbs) Then
    MsgBox "No se encontró el archivo: " & targetVbs, 16, "Búnker POS - Error de Instalación"
    WScript.Quit
End If

startupFolder = WshShell.SpecialFolders("Startup")
shortcutPath = startupFolder & "\BunkerPOS.lnk"

Set oShortcut = WshShell.CreateShortcut(shortcutPath)
oShortcut.TargetPath = "wscript.exe"
oShortcut.Arguments = """" & targetVbs & """ Caja silent"
oShortcut.WorkingDirectory = strFolder
oShortcut.WindowStyle = 7 ' Minimized
oShortcut.Description = "Servidor de Impresión Búnker POS (Segundo Plano)"

' Asignar icono si existe
iconPng = strFolder & "\client\public\iconCG-32x32.png"
If objFSO.FileExists(iconPng) Then
    oShortcut.IconLocation = targetVbs & ",0"
End If

oShortcut.Save

MsgBox "¡Instalación exitosa!" & vbCrLf & vbCrLf & _
       "El Servidor de Impresión de Búnker POS ahora se iniciará AUTOMÁTICAMENTE cada vez que enciendas esta PC o Laptop." & vbCrLf & vbCrLf & _
       "Acceso directo creado en:" & vbCrLf & shortcutPath, 64, "Búnker POS - Inicio Automático Configurado"
