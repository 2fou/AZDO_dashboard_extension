// Import jsPDF and html2canvas if needed
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

function generatePDF() {
    const content = document.getElementById('dashboard-content');

    if (content) {
        html2canvas(content).then(canvas => {
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF();
            pdf.addImage(imgData, 'PNG', 10, 10);
            pdf.save('dashboard-report.pdf');
        });
    }
}