# selector.ps1 - Ventana interactiva de configuración para Búnker POS
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$form = New-Object System.Windows.Forms.Form
$form.Text = "Búnker POS - Estación de Impresión"
$form.Size = New-Object System.Drawing.Size(380, 275)
$form.StartPosition = "CenterScreen"
$form.FormBorderStyle = "FixedDialog"
$form.MaximizeBox = $false
$form.MinimizeBox = $false
$form.TopMost = $true

$label = New-Object System.Windows.Forms.Label
$label.Location = New-Object System.Drawing.Point(22, 18)
$label.Size = New-Object System.Drawing.Size(320, 22)
$label.Text = "Selecciona la función de este equipo:"
$label.Font = New-Object System.Drawing.Font("Segoe UI", 9.5, [System.Drawing.FontStyle]::Bold)
$form.Controls.Add($label)

$combo = New-Object System.Windows.Forms.ComboBox
$combo.Location = New-Object System.Drawing.Point(22, 48)
$combo.Size = New-Object System.Drawing.Size(320, 28)
$combo.DropDownStyle = [System.Windows.Forms.ComboBoxStyle]::DropDownList
$combo.Font = New-Object System.Drawing.Font("Segoe UI", 10)
$combo.Items.Add("Caja (Comprobantes, Precuentas y Cobro)") | Out-Null
$combo.Items.Add("Cocina (Comandas de Preparación)") | Out-Null
$combo.SelectedIndex = 0
$form.Controls.Add($combo)

$check = New-Object System.Windows.Forms.CheckBox
$check.Location = New-Object System.Drawing.Point(24, 92)
$check.Size = New-Object System.Drawing.Size(320, 42)
$check.Text = "Iniciar automáticamente con Windows`n(Recomendado para esta PC o Laptop)"
$check.Font = New-Object System.Drawing.Font("Segoe UI", 8.5)
$check.Checked = $true
$form.Controls.Add($check)

$btnOk = New-Object System.Windows.Forms.Button
$btnOk.Location = New-Object System.Drawing.Point(22, 155)
$btnOk.Size = New-Object System.Drawing.Size(205, 38)
$btnOk.Text = "Iniciar Búnker POS"
$btnOk.Font = New-Object System.Drawing.Font("Segoe UI", 9.5, [System.Drawing.FontStyle]::Bold)
$btnOk.DialogResult = [System.Windows.Forms.DialogResult]::OK
$btnOk.BackColor = [System.Drawing.Color]::FromArgb(16, 185, 129)
$btnOk.ForeColor = [System.Drawing.Color]::White
$btnOk.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
$form.AcceptButton = $btnOk
$form.Controls.Add($btnOk)

$btnCancel = New-Object System.Windows.Forms.Button
$btnCancel.Location = New-Object System.Drawing.Point(237, 155)
$btnCancel.Size = New-Object System.Drawing.Size(105, 38)
$btnCancel.Text = "Cancelar"
$btnCancel.Font = New-Object System.Drawing.Font("Segoe UI", 9)
$btnCancel.DialogResult = [System.Windows.Forms.DialogResult]::Cancel
$form.CancelButton = $btnCancel
$form.Controls.Add($btnCancel)

$res = $form.ShowDialog()
if ($res -eq [System.Windows.Forms.DialogResult]::OK) {
    $station = if ($combo.SelectedIndex -eq 1) { "Cocina" } else { "Caja" }
    $auto = if ($check.Checked) { "1" } else { "0" }
    Write-Output "OK:$station:$auto"
} else {
    Write-Output "CANCEL"
}
