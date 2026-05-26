import zipfile
import xml.etree.ElementTree as ET
import os

docx_path = r"c:\Users\binig\Desktop\global-connect-ethiopia\documentation\Global_Connect_Ethiopia_–_International_Professional_Event_Hub_1.docx"
txt_path = r"c:\Users\binig\Desktop\global-connect-ethiopia\documentation\Global_Connect_Ethiopia_–_International_Professional_Event_Hub_1.txt"

def extract_docx_text(docx_file):
    try:
        with zipfile.ZipFile(docx_file) as z:
            xml_content = z.read('word/document.xml')
            root = ET.fromstring(xml_content)
            
            # Namespace for Word XML
            ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
            
            paragraphs = []
            for para in root.findall('.//w:p', ns):
                texts = []
                for node in para.findall('.//w:t', ns):
                    if node.text:
                        texts.append(node.text)
                if texts:
                    paragraphs.append("".join(texts))
            
            return "\n".join(paragraphs)
    except Exception as e:
        return f"Error extracting text: {e}"

if os.path.exists(docx_path):
    text = extract_docx_text(docx_path)
    with open(txt_path, 'w', encoding='utf-8') as f:
        f.write(text)
    print("SUCCESS: Extracted text and wrote to", txt_path)
else:
    print("ERROR: DOCX file not found at", docx_path)
