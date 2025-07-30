// src/utils/utils.tsx

import jsPDF from 'jspdf';
import * as SDK from "azure-devops-extension-sdk";
import { Dashboard } from "azure-devops-extension-api/Dashboard";

const SELECTOR_OPTIONS = [
    ".content",
    '.devops-dashboard-grid.flex-grow',         // Whole dashboard grid (recommended)
    '.dashboard-content.flex-grow.flex-row.scroll-hidden', // All dashboard with possibly headers
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

const LOADING_SELECTORS = [
    '.loading',
    '[class*="loading"]',
    '.spinner',
    '[class*="spinner"]',
    '[aria-busy="true"]',
    '.ms-Spinner',
    '.bowtie-spinner'
];

const WAIT_INTERVAL = 500;
const FINAL_WAIT_DELAY = 2000;

/**
 * Capture the visual content of the dashboard.
 * @returns The first matching HTMLElement or null if not found.
 */
export const captureDashboardVisualContent = async (): Promise<HTMLElement | null> => {
    for (const selector of SELECTOR_OPTIONS) {
        const element = document.querySelector(selector) as HTMLElement;
        if (element && element.offsetHeight > 0 && element.offsetWidth > 0) {
            console.log("Will capture with selector:", selector, element);
            return element;
        } else {
            console.log("Selector not found or not visible:", selector);
        }
    }

    return findWidgetContainer() || null;
};

/**
 * Helper function to fallback for widget containers if initial captures fail.
 * @returns The parent HTMLElement of the first widget container found.
 */
const findWidgetContainer = (): HTMLElement | null => {
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

/**
 * Wait for the dashboard to load completely by checking for loading indicators.
 * @param maxWaitTime Maximum time to wait in milliseconds.
 */
export const waitForDashboardToLoad = async (maxWaitTime: number = 15000): Promise<void> => {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
        if (!isLoading()) {
            await new Promise(resolve => setTimeout(resolve, FINAL_WAIT_DELAY));
            return;
        }

        await new Promise(resolve => setTimeout(resolve, WAIT_INTERVAL));
    }
};

/**
 * Check if loading indicators are present on the dashboard.
 * @returns True if loading indicators exist, otherwise false.
 */
const isLoading = (): boolean => {
    const loadingElements = document.querySelectorAll(LOADING_SELECTORS.join(','));
    return loadingElements.length > 0;
};

/**
 * Generate a PDF from a given canvas element.
 * @param canvas HTMLCanvasElement to be converted to PDF.
 * @param dashboardData Dashboard metadata for PDF header information.
 */
export const generatePDFFromCanvas = async (canvas: HTMLCanvasElement, dashboardData: Dashboard): Promise<void> => {
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;

    const pdf = new jsPDF({
        orientation: imgWidth > imgHeight ? 'landscape' : 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    addPDFHeader(pdf, dashboardData);

    const imgData = canvas.toDataURL('image/png');
    addImageToPDF(pdf, imgData, imgWidth, imgHeight);

    addMetaDataPage(pdf, dashboardData);

    pdf.save(generatePDFFileName(dashboardData));
};

/**
 * Add header details to the PDF.
 */
const addPDFHeader = (pdf: jsPDF, dashboardData: Dashboard): void => {
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text(dashboardData.name, 20, 20);

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Generated on: ${new Date().toLocaleString()}`, 20, 30);
    pdf.text(`Project: ${SDK.getWebContext().project.name}`, 20, 35);
};

/**
 * Convert canvas image to PDF content.
 */
const addImageToPDF = (pdf: jsPDF, imgData: string, imgWidth: number, imgHeight: number): void => {
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const margin = 20;
    const availableWidth = pageWidth - (margin * 2);
    const availableHeight = pageHeight - 50;

    const scaleX = availableWidth / (imgWidth * 0.264583);
    const scaleY = availableHeight / (imgHeight * 0.264583);
    const scale = Math.min(scaleX, scaleY);

    const finalWidth = (imgWidth * 0.264583) * scale;
    const finalHeight = (imgHeight * 0.264583) * scale;

    pdf.addImage(imgData, 'PNG', margin, 45, finalWidth, finalHeight);
};

/**
 * Add metadata page to the PDF.
 */
const addMetaDataPage = (pdf: jsPDF, dashboardData: Dashboard): void => {
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
};

/**
 * Generate filenames that are consistent and legible.
 */
const generatePDFFileName = (dashboardData: Dashboard): string => {
    return `${dashboardData.name.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
};