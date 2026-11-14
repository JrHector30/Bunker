' =====================================================================
' BÚNKER POS - DESINSTALADOR DE INICIO AUTOMÁTICO CON WINDOWS
' =====================================================================
Set WshShell = CreateObject("WScript.Shell")
Set objFSO = CreateObject("Scripting.FileSystemObject")

startupFolder = WshShell.SpecialFolders("Startup")
shortcutPath = startupFolder & "\BunkerPOS.lnk"

If objFSO.FileExists(shortcutPath) Then
    objFSO.DeleteFile(shortcutPath)
    MsgBox "Se ha removido Búnker POS del inicio automático de Windows.", 64, "Búnker POS - Inicio Removido"
Else
    MsgBox "Búnker POS no estaba configurado en el inicio automático de Windows.", 48, "Búnker POS"
End If
