import jsPDF from 'jspdf';
import * as SDK from "azure-devops-extension-sdk";
import { Dashboard } from "azure-devops-extension-api/Dashboard";

export const generatePDFFromCanvas = async (canvas: HTMLCanvasElement, dashboardData: Dashboard): Promise<void> => {
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    
    const pdf = new jsPDF({
        orientation: imgWidth > imgHeight ? 'landscape' : 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    // Add header
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text(dashboardData.name, 20, 20);
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Generated on: ${new Date().toLocaleString()}`, 20, 30);
    pdf.text(`Project: ${SDK.getWebContext().project.name}`, 20, 35);

    // Convert canvas to image and add to PDF
    const imgData = canvas.toDataURL('image/png');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    
    const margin = 20;
    const availableWidth = pageWidth - (margin * 2);
    const availableHeight = pageHeight - 50;
    
    // Calculate scaling to fit the page
    const scaleX = availableWidth / (imgWidth * 0.264583);
    const scaleY = availableHeight / (imgHeight * 0.264583);
    const scale = Math.min(scaleX, scaleY);
    
    const finalWidth = (imgWidth * 0.264583) * scale;
    const finalHeight = (imgHeight * 0.264583) * scale;
    
    pdf.addImage(imgData, 'PNG', margin, 45, finalWidth, finalHeight);

    // Add metadata page
    pdf.addPage();
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Dashboard Information', 20, 30);
    
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    let yPos = 45;
    
    const metadata = [
        `Name: ${dashboardData.name}`,
        `Description: ${dashboardData.description || 'No description'}`,
        `Last Modified: ${new Date(dashboardData.lastAccessedDate).toLocaleString()}`,
        `Widgets: ${dashboardData.widgets.length}`,
        `Dashboard ID: ${dashboardData.id}`
    ];
    
    metadata.forEach(line => {
        pdf.text(line, 20, yPos);
        yPos += 10;
    });

    const fileName = `${dashboardData.name.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(fileName);
};
