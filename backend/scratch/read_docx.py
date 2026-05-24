import os
import zipfile
import xml.etree.ElementTree as ET

def get_docx_text(path):
    WORD_NAMESPACE = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
    PARA = WORD_NAMESPACE + 'p'
    TEXT = WORD_NAMESPACE + 't'
    
    with zipfile.ZipFile(path) as docx:
        tree = ET.parse(docx.open('word/document.xml'))
        root = tree.getroot()
        paragraphs = []
        for paragraph in root.iter(PARA):
            texts = [node.text for node in paragraph.iter(TEXT) if node.text]
            if texts:
                paragraphs.append(''.join(texts))
        return '\n'.join(paragraphs)

if __name__ == '__main__':
    docx_path = r"c:\Users\Rinatoh computer\global-connect-ethiopia\documentation\Global_Connect_Ethiopia_–_International_Professional_Event_Hub_1.docx"
    output_path = r"c:\Users\Rinatoh computer\global-connect-ethiopia\backend\scratch\docx_text.txt"
    
    try:
        print(f"Reading DOCX file from: {docx_path}")
        text = get_docx_text(docx_path)
        print(f"Extracted {len(text)} characters. Writing to {output_path}...")
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(text)
        print("Done!")
    except Exception as e:
        print(f"Error: {e}")
