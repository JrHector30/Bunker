import os
import win32com.client

html_path = os.path.abspath('thesis_document.html')
docx_path = os.path.abspath('PROYECTO_INNOVACION_TECNOLOGICA_BUNKER_IESTP_MRAP.docx')

print(f"Opening {html_path} in Word...")
word = win32com.client.Dispatch('Word.Application')
word.Visible = False
try:
    doc = word.Documents.Open(html_path)
    # FileFormat=16 is wdFormatXMLDocument (DOCX)
    doc.SaveAs2(docx_path, FileFormat=16)
    doc.Close()
    print(f"Updated {docx_path} successfully!")
except Exception as e:
    print(f"Error: {e}")
finally:
    word.Quit()
