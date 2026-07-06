param(
    [string]$printerName,
    [string]$filePath,
    [int]$codepage,
    [string]$initCmd,
    [string]$charTableCmd,
    [string]$cutCmd
)

# Cargar la API nativa de Windows Spooler para inyección directa de bytes
$code = @"
using System;
using System.Runtime.InteropServices;

public class RawPrinterHelper {
    [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Ansi)]
    public class DOCINFOA {
        [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
        [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
        [MarshalAs(UnmanagedType.LPStr)] public string pDataType;
    }
    [DllImport("winspool.drv", EntryPoint="OpenPrinterA", CharSet=CharSet.Ansi, SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
    public static extern bool OpenPrinter([MarshalAs(UnmanagedType.LPStr)] string szPrinter, out IntPtr hPrinter, IntPtr pd);

    [DllImport("winspool.drv", EntryPoint="ClosePrinter", CharSet=CharSet.Ansi, SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
    public static extern bool ClosePrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", EntryPoint="StartDocPrinterA", CharSet=CharSet.Ansi, SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
    public static extern bool StartDocPrinter(IntPtr hPrinter, Int32 level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFOA di);

    [DllImport("winspool.drv", EntryPoint="EndDocPrinter", SetLastError=true, ExactSpelling=true)]
    public static extern bool EndDocPrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", EntryPoint="StartPagePrinter", SetLastError=true, ExactSpelling=true)]
    public static extern bool StartPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", EntryPoint="EndPagePrinter", SetLastError=true, ExactSpelling=true)]
    public static extern bool EndPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", EntryPoint="WritePrinter", SetLastError=true, ExactSpelling=true)]
    public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, Int32 dwCount, out Int32 dwWritten);

    public static bool SendBytesToPrinter(string szPrinterName, byte[] bytes) {
        IntPtr hPrinter = IntPtr.Zero;
        DOCINFOA di = new DOCINFOA();
        bool bSuccess = false;
        di.pDocName = "Bunker Ticket ESCPOS";
        di.pDataType = "RAW";
        if (OpenPrinter(szPrinterName, out hPrinter, IntPtr.Zero)) {
            if (StartDocPrinter(hPrinter, 1, di)) {
                if (StartPagePrinter(hPrinter)) {
                    IntPtr pUnmanagedBytes = Marshal.AllocHGlobal(bytes.Length);
                    Marshal.Copy(bytes, 0, pUnmanagedBytes, bytes.Length);
                    int written = 0;
                    bSuccess = WritePrinter(hPrinter, pUnmanagedBytes, bytes.Length, out written);
                    Marshal.FreeHGlobal(pUnmanagedBytes);
                    EndPagePrinter(hPrinter);
                }
                EndDocPrinter(hPrinter);
            }
            ClosePrinter(hPrinter);
        }
        return bSuccess;
    }
}
"@

if (-not ([System.Management.Automation.PSTypeName]'RawPrinterHelper').Type) {
    Add-Type -TypeDefinition $code
}

# Utilidad para convertir string de comandos separados por comas a bytes
function Convert-CmdToBytes($cmdString) {
    if ([string]::IsNullOrEmpty($cmdString)) { return @() }
    return [byte[]]($cmdString -split ',' | ForEach-Object { [byte][int]$_ })
}

if (Test-Path $filePath) {
    # 1. Leer el texto UTF-8 temporal generado por node
    $utf8Text = [System.IO.File]::ReadAllText($filePath, [System.Text.Encoding]::UTF8)

    # 2. Parsear comandos ESC/POS a bytes
    $initBytes = Convert-CmdToBytes $initCmd
    $charTableBytes = Convert-CmdToBytes $charTableCmd
    $cutBytes = Convert-CmdToBytes $cutCmd

    # 3. Convertir el texto UTF-8 a bytes de la página de códigos destino (ej. CP850 o CP437)
    # Si no se encuentra el codepage, se cae por defecto a CP850
    try {
        $encoding = [System.Text.Encoding]::GetEncoding($codepage)
    } catch {
        $encoding = [System.Text.Encoding]::GetEncoding(850)
    }
    $textBytes = $encoding.GetBytes($utf8Text)

    # 4. Consolidar el búfer completo de impresión
    $buffer = New-Object System.Collections.Generic.List[byte]
    $buffer.AddRange($initBytes)
    $buffer.AddRange($charTableBytes)
    $buffer.AddRange($textBytes)
    $buffer.AddRange($cutBytes)

    # 5. Enviar stream directo al spooler
    $rawBytes = $buffer.ToArray()
    $res = [RawPrinterHelper]::SendBytesToPrinter($printerName, $rawBytes)
    
    if ($res) {
        Write-Host "✅ Ticket ESC/POS inyectado con éxito en: $printerName"
    } else {
        Write-Error "❌ Error al inyectar bytes ESC/POS en: $printerName"
    }
} else {
    Write-Error "❌ Archivo de ticket no encontrado: $filePath"
}
