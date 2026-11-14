' Redirección al lanzador maestro de Búnker POS
Set WshShell = CreateObject("WScript.Shell")
Set objFSO = CreateObject("Scripting.FileSystemObject")
strFolder = objFSO.GetParentFolderName(WScript.ScriptFullName)
target = strFolder & "\INICIAR_BUNKER_POS.vbs"
If Not objFSO.FileExists(target) Then target = objFSO.GetParentFolderName(strFolder) & "\INICIAR_BUNKER_POS.vbs"
WshShell.Run "wscript.exe """ & target & """ Caja", 0, false
