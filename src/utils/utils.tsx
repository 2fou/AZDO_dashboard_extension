// src/utils/utils.tsx

import jsPDF from 'jspdf';
import * as SDK from "azure-devops-extension-sdk";
import { Dashboard } from "azure-devops-extension-api/Dashboard";

// Capture the visual content of the dashboard
export const captureDashboardVisualContent = async (): Promise<HTMLElement | null> => {
    const possibleSelectors = [
        '.dashboard-container',
        '[data-testid="dashboard-container"]',
        '.dashboard-content',
        '.dashboard-canvas',
        '.dashboard-grid',
        '.grid-container',
        '[class*="dashboard"]',
        'main[role="main"]',
        '[data-vss-hub="dashboard"]',
        '.hub-content'
    ];

    for (const selector of possibleSelectors) {
        const element = document.querySelector(selector) as HTMLElement;
        if (element && element.offsetHeight > 0 && element.offsetWidth > 0) {
            return element;
        }
    }

    // Fallback: look for widget containers
    const widgetsContainer = document.querySelector('[class*="widget"]') as HTMLElement;
    if (widgetsContainer) {
        let parent = widgetsContainer.parentElement;
        while (parent && parent !== document.body) {
            if (parent.children.length > 1 && parent.offsetHeight > 0) {
                return parent;
            }
            parent = parent.parentElement;
        }
    }

    return null;
};

// Wait for the dashboard to load completely
export const waitForDashboardToLoad = async (maxWaitTime: number = 15000): Promise<void> => {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
        const loadingElements = document.querySelectorAll([
            '.loading',
            '[class*="loading"]',
            '.spinner',
            '[class*="spinner"]',
            '[aria-busy="true"]',
            '.ms-Spinner',
            '.bowtie-spinner'
        ].join(','));

        if (loadingElements.length === 0) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            return;
        }

        await new Promise(resolve => setTimeout(resolve, 500));
    }
};

// Generate a PDF from a given canvas element
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