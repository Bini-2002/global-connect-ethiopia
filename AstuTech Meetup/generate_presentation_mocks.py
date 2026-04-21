
import os

try:
    from reportlab.pdfgen import canvas
except ImportError:
    os.system('pip install reportlab')
    from reportlab.pdfgen import canvas

folder = r'C:\Users\binig\Desktop\global-connect-ethiopia\AstuTech Meetup'

def create_mock_pdf(filename, title, content):
    path = os.path.join(folder, filename)
    c = canvas.Canvas(path)
    c.drawString(100, 750, title)
    c.drawString(100, 730, content)
    c.save()
    print(f'Created {path}')

create_mock_pdf('ASTU_University_License.pdf', 'ASTU University', 'Official Organizer Business License')
create_mock_pdf('Biniyam_Representative_ID.pdf', 'Biniyam Getachew', 'Official Representative ID')
create_mock_pdf('Addis_Catering_License.pdf', 'Addis Catering', 'Vendor Business License')
create_mock_pdf('Event_Proposal_Plan.pdf', 'ASTU Tech Meetup', 'Proposal Details for 30 attendees')
create_mock_pdf('Signed_Contract.pdf', 'Vendor-Organizer Contract', 'Contract between ASTU and Addis Catering')

