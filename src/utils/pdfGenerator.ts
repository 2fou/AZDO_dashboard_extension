import { jsPDF } from 'jspdf';
import * as SDK from "azure-devops-extension-sdk";
import { Dashboard } from "azure-devops-extension-api/Dashboard";

export const generatePDFFromCanvas = async (canvas: HTMLCanvasElement, dashboardData: Dashboard): Promise<void> => {
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = Math.min(297/imgWidth, 210/imgHeight);
    
    const pdf = new jsPDF({
        orientation: imgWidth > imgHeight ? 'landscape' : 'portrait',
        unit: 'mm',
        format: 'a4'
    });
    
    // Add header
    pdf.setFontSize(16);
    pdf.setFont(undefined, 'bold');
    pdf.text(dashboardData.name, 20, 20);
    
    pdf.setFontSize(10);
    pdf.setFont(undefined, 'normal');
    pdf.text(`Generated on: ${new Date().toLocaleString()}`, 20, 30);
    pdf.text(`Project: ${SDK.getContext().project.name}`, 20, 35);
    
    const imgData = canvas.toDataURL('image/png');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    
    const availableWidth = pageWidth - (margin * 2);
    const availableHeight = pageHeight - 50;
    
    const finalRatio = Math.min(availableWidth/imgWidth, availableHeight/imgHeight);
    const finalWidth = imgWidth * finalRatio;
    const finalHeight = imgHeight * finalRatio;
    
    pdf.addImage(imgData, 'PNG', margin, 45, finalWidth, finalHeight);
    
    // Add metadata page
    pdf.addPage();
    pdf.setFontSize(14);
    pdf.setFont(undefined, 'bold');
    pdf.text('Dashboard Information', 20, 30);
    
    pdf.setFontSize(12);
    pdf.setFont(undefined, 'normal');
    let yPos = 45;
    
    const metadata = [
        `Name: ${dashboardData.name}`,
        `Description: ${dashboardData.description || 'No description'}`,
        `Owner: ${dashboardData.ownedBy?.displayName || 'Unknown'}`,
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

export const generateMetadataPDF = async (
    dashboardData: Dashboard, 
    includeHeader: boolean, 
    includeWidgets: boolean
): Promise<void> => {
    const doc = new jsPDF();
    
    if (includeHeader) {
        doc.setFontSize(20);
        doc.text(`Dashboard: ${dashboardData.name}`, 20, 30);
        
        doc.setFontSize(12);
        doc.text(`Description: ${dashboardData.description || 'No description'}`, 20, 50);
        doc.text(`Project: ${SDK.getContext().project.name}`, 20, 70);
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 90);
        doc.text(`Number of widgets: ${dashboardData.widgets.length}`, 20, 110);
    }
    
    let yPosition = includeHeader ? 140 : 30;
    
    if (includeWidgets) {
        doc.text('Widgets:', 20, yPosition);
        yPosition += 20;
        
        dashboardData.widgets.forEach((widget, index) => {
            if (yPosition > 250) {
                doc.addPage();
                yPosition = 30;
            }
            
            doc.text(`${index + 1}. ${widget.name}`, 25, yPosition);
            doc.text(`   Size: ${widget.size.columnSpan}x${widget.size.rowSpan}`, 25, yPosition + 10);
            doc.text(`   Position: (${widget.position.column}, ${widget.position.row})`, 25, yPosition + 20);
            yPosition += 35;
        });
    }
    
    const fileName = `${dashboardData.name.replace(/[^a-z0-9]/gi, '_')}_metadata.pdf`;
    doc.save(fileName);
};
