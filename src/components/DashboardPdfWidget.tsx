import React, { useState, useEffect } from 'react';
import * as SDK from "azure-devops-extension-sdk";
import { DashboardRestClient } from "azure-devops-extension-api/Dashboard";
import { getClient } from "azure-devops-extension-api";
import { captureDashboardVisualContent, waitForDashboardToLoad } from '../utils/dashboardCapture';
import { generateMetadataPDF } from '../utils/pdfGenerator';
import html2canvas from 'html2canvas';

const DashboardPdfWidget: React.FC = () => {
    const [status, setStatus] = useState<{ message: string; type: string }>({ message: '', type: '' });
    const [isExporting, setIsExporting] = useState<boolean>(false);

    useEffect(() => {
        const initialize = async () => {
            await SDK.init();
            SDK.register(SDK.getContributionId(), {
                load: function() {
                    return { name: "PDF Export Widget", size: { width: 1, height: 1 } };
                }
            });
        };
        initialize();
    }, []);

    const showStatus = (message: string, type: string) => {
        setStatus({ message, type });
        if (type === 'success') {
            setTimeout(() => {
                setStatus({ message: '', type: '' });
            }, 3000);
        }
    };

    const handleExportClick = async () => {
        if (isExporting) return;
        
        setIsExporting(true);
        try {
            showStatus('Generating PDF...', 'info');
            await exportCurrentDashboard();
            showStatus('PDF generated successfully!', 'success');
        } catch (error) {
            console.error('PDF generation failed:', error);
            showStatus(`Error: ${error}`, 'error');
        } finally {
            setIsExporting(false);
        }
    };

    const exportCurrentDashboard = async () => {
        try {
            const dashboardElement = await captureDashboardVisualContent();
            
            if (!dashboardElement) {
                throw new Error('Dashboard container not found');
            }
            
            await waitForDashboardToLoad();
            
            const canvas = await html2canvas(dashboardElement, {
                allowTaint: true,
                useCORS: true,
                scale: 2,
                scrollX: 0,
                scrollY: 0,
                width: dashboardElement.scrollWidth,
                height: dashboardElement.scrollHeight,
                backgroundColor: '#ffffff'
            });
            
            // Convert canvas to PDF and download
            const link = document.createElement('a');
            link.download = `dashboard_${new Date().toISOString().split('T')[0]}.png`;
            link.href = canvas.toDataURL();
            link.click();
            
        } catch (error) {
            throw new Error(`Failed to export dashboard: ${error}`);
        }
    };

    return (
        <div className="widget pdf-export-widget">
            <button 
                className={`export-button ${isExporting ? 'exporting' : ''}`}
                onClick={handleExportClick}
                disabled={isExporting}
                title="Export Dashboard to PDF"
            >
                <span className="button-icon">📄</span>
                <span className="button-text">
                    {isExporting ? 'Exporting...' : 'Export PDF'}
                </span>
            </button>
            {status.message && (
                <div className={`status-message ${status.type}`}>
                    {status.message}
                </div>
            )}
        </div>
    );
};

export default DashboardPdfWidget;
