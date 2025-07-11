// src/dashboard-pdf-widget/dashboard-pdf-widget.tsx
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import * as SDK from "azure-devops-extension-sdk";
import { DashboardRestClient, Dashboard } from "azure-devops-extension-api/Dashboard";
import { getClient } from "azure-devops-extension-api";
import { TeamContext } from "azure-devops-extension-api/Core";
import { captureDashboardVisualContent, waitForDashboardToLoad } from '../utils/utils';
import { generatePDFFromCanvas } from '../utils/utils';
import html2canvas from 'html2canvas';
import '../styles/styles.css';

const DashboardPdfWidget: React.FC = () => {
    const [status, setStatus] = useState<{ message: string; type: string }>({ message: '', type: '' });
    const [isExporting, setIsExporting] = useState(false);
    const [dashboardInfo, setDashboardInfo] = useState<{ name: string; id: string } | null>(null);
    const [teamContext, setTeamContext] = useState<TeamContext | null>(null);

    useEffect(() => {
        SDK.init();
        const initialize = async () => {
            const webContext = SDK.getWebContext();

            const context: TeamContext = {
                project: webContext.project.name,
                projectId: webContext.project.id,
                team: webContext.team?.name ?? "",
                teamId: webContext.team?.id ?? ""
            };

            setTeamContext(context);

            SDK.register(SDK.getContributionId(), {
                load: function(widgetSettings: any) {
                    const dashboardId = widgetSettings.dashboard?.id || 
                                       widgetSettings.dashboardId || 
                                       extractDashboardIdFromUrl();

                    if (dashboardId) {
                        setDashboardInfo({
                            id: dashboardId,
                            name: widgetSettings.dashboard?.name || 'Current Dashboard'
                        });
                    }

                    return { name: "PDF Export Widget", size: { width: 1, height: 1 } };
                }
            });
        };
        initialize();
    }, []);

    const extractDashboardIdFromUrl = (): string | null => {
        try {
            const url = window.location.href;
            const regex = /dashboards\/([a-f0-9-]+)/i;
            const dashboardMatch = regex.exec(url);
            return dashboardMatch ? dashboardMatch[1] : null;
        } catch (error) {
            console.warn('Could not extract dashboard ID from URL:', error);
            return null;
        }
    };

    const getCurrentDashboard = async (): Promise<Dashboard> => {
        try {
            if (!teamContext) {
                throw new Error('Team context is not available');
            }

            const dashboardClient = getClient(DashboardRestClient);

            if (dashboardInfo?.id) {
                return await dashboardClient.getDashboard(teamContext, dashboardInfo.id);
            }

            const dashboards = await dashboardClient.getDashboardsByProject(teamContext);

            if (!dashboards || dashboards.length === 0) {
                throw new Error('No dashboards found');
            }

            const currentDashboardId = extractDashboardIdFromUrl();
            if (currentDashboardId) {
                const currentDashboard = dashboards.find((d: Dashboard) => d.id === currentDashboardId);
                if (currentDashboard) {
                    return currentDashboard;
                }
            }

            return dashboards[0];
        } catch (error) {
            console.error('Error getting current dashboard:', error);
            throw error;
        }
    };

    const handleExportClick = async () => {
        if (isExporting) return;
        setIsExporting(true);

        try {
            setStatus({ message: 'Getting dashboard information...', type: 'info' });

            const currentDashboard = await getCurrentDashboard();

            if (!currentDashboard) {
                throw new Error('Could not identify current dashboard');
            }

            setStatus({ message: `Capturing dashboard: ${currentDashboard.name}...`, type: 'info' });

            const dashboardElement = await captureDashboardVisualContent();
            if (!dashboardElement) {
                throw new Error('Dashboard container not found');
            }

            await waitForDashboardToLoad();

            setStatus({ message: 'Generating PDF...', type: 'info' });

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

            await generatePDFFromCanvas(canvas, currentDashboard);

            setStatus({ message: `PDF for "${currentDashboard.name}" generated successfully!`, type: 'success' });
            setTimeout(() => setStatus({ message: '', type: '' }), 3000);

        } catch (error) {
            console.error('PDF generation failed:', error);
            setStatus({ message: `Error: ${error}`, type: 'error' });
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div style={{ padding: '10px', textAlign: 'center' }}>
            {dashboardInfo && (
                <div style={{ 
                    fontSize: '11px', 
                    color: '#666', 
                    marginBottom: '8px',
                    textAlign: 'left' 
                }}>
                    Dashboard: {dashboardInfo.name}
                </div>
            )}
            <button 
                onClick={handleExportClick}
                disabled={isExporting}
                style={{
                    padding: '10px 20px',
                    fontSize: '14px',
                    backgroundColor: isExporting ? '#ccc' : '#0078d4',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: isExporting ? 'not-allowed' : 'pointer'
                }}
            >
                {isExporting ? 'Exporting...' : 'Export Current Dashboard'}
            </button>
            {status.message && (
                <div style={{
                    marginTop: '10px',
                    padding: '8px',
                    backgroundColor: status.type === 'error' ? '#ffebee' : 
                                   status.type === 'success' ? '#e8f5e8' : '#fff3cd',
                    color: status.type === 'error' ? '#c62828' : 
                           status.type === 'success' ? '#2e7d32' : '#856404',
                    borderRadius: '4px',
                    fontSize: '12px'
                }}>
                    {status.message}
                </div>
            )}
        </div>
    );
};

const widgetRootElement = document.getElementById('widget-root');
if (widgetRootElement) {
    ReactDOM.render(<DashboardPdfWidget />, widgetRootElement);
} else {
    console.error('Widget root element not found');
}