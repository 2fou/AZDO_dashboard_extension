import React from 'react';
import ReactDOM from 'react-dom';
import * as SDK from "azure-devops-extension-sdk";
import { DashboardRestClient, Dashboard } from "azure-devops-extension-api/Dashboard";
import { getClient } from "azure-devops-extension-api";
import { TeamContext } from "azure-devops-extension-api/Core";
import { CommonServiceIds, IProjectPageService } from "azure-devops-extension-api";
import { captureDashboardVisualContent, waitForDashboardToLoad } from '../utils/utils';
import { generatePDFFromCanvas } from '../utils/utils';
import html2canvas from 'html2canvas';
import '../styles/styles.css';

class DashboardPdfWidget extends React.Component {
    state = {
        status: { message: '', type: '' },
        isExporting: false,
        teamContext: null as TeamContext | null,
    };

    async componentDidMount() {
        console.log('Initializing widget...');
        await SDK.init();
        await SDK.ready();
        SDK.register('dashboard-pdf-widget-react', this);
        console.log('SDK is ready');

        await this.setWebContext();
    }

    setWebContext = async () => {
        try {
            const projectService = await SDK.getService<IProjectPageService>(CommonServiceIds.ProjectPageService);
            console.log('Project service retrieved:', projectService);
            const project = await projectService.getProject();
            console.log('Project information:', project);
            
            if (project) {
                const context: TeamContext = {
                    project: project.name,
                    projectId: project.id,
                    // Add your team logic here if needed
                    team: "",
                    teamId: ""
                };
                console.log('Team context set:', context);
                this.setState({ teamContext: context });
            } else {
                throw new Error('Project information could not be retrieved');
            }
        } catch (error) {
            console.error('Failed to set web context:', error);
            this.setState({ status: { message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`, type: 'error' } });
        }
    }

    handleExportClick = async () => {
        if (this.state.isExporting) return;

        console.log('Export button clicked');
        this.setState({ isExporting: true });
        try {
            this.setState({ status: { message: 'Preparing export...', type: 'info' } });

            const currentDashboard = await this.loadCurrentDashboard();
            console.log('Current dashboard loaded:', currentDashboard);

            await waitForDashboardToLoad();
            console.log('Dashboard loading completed');

            const dashboardElement = await captureDashboardVisualContent();
            if (!dashboardElement) throw new Error('Dashboard container not found');

            console.log('Captured dashboard visual content');
            const canvas = await html2canvas(dashboardElement, { /* configurations */ });
            console.log('Canvas created from visual content');

            await generatePDFFromCanvas(canvas, currentDashboard);
            console.log(`PDF for "${currentDashboard.name}" generated successfully`);

            this.setState({ status: { message: `PDF for "${currentDashboard.name}" generated successfully!`, type: 'success' } });
        } catch (error) {
            console.error('PDF generation failed:', error);
            this.setState({ status: { message: `Error: ${error instanceof Error ? error.message : String(error)}`, type: 'error' } });
        } finally {
            console.log('Export process completed');
            this.setState({ isExporting: false });
        }
    };

    loadCurrentDashboard = async (): Promise<Dashboard> => {
        if (!this.state.teamContext) throw new Error('Team context is not available');

        const dashboardClient = getClient(DashboardRestClient);
        const dashboards = await dashboardClient.getDashboardsByProject(this.state.teamContext);
        console.log('Dashboards fetched:', dashboards.length);

        const dashboardId = this.extractDashboardIdFromUrl();
        console.log('Extracted dashboard ID:', dashboardId);

        if (dashboardId) {
            const matchedDashboard = dashboards.find(d => d.id === dashboardId);
            console.log('Matched dashboard:', matchedDashboard);
            if (matchedDashboard) {
                return matchedDashboard;
            } else {
                throw new Error("Dashboard not identified");
            }
        }

        throw new Error("Current dashboard could not be identified.");
    };

    extractDashboardIdFromUrl = (): string | null => {
        const url = window.location.href;
        const match = /dashboards\/([a-f0-9-]+)/i.exec(url);
        console.log('Extracting dashboard ID from URL:', url);
        return match ? match[1] : null;
    };

    render() {
        const { status, isExporting } = this.state;
        return (
            <div className="pdf-export-widget">
                <button
                    onClick={this.handleExportClick}
                    disabled={isExporting}
                    className={`export-button ${isExporting ? 'exporting' : ''}`}
                >
                    {isExporting ? 'Exporting...' : 'Export Dashboard to PDF'}
                </button>
                {status.message && (
                    <div className={`status-message ${status.type}`}>
                        {status.message}
                    </div>
                )}
            </div>
        );
    }
}

const widgetRootElement = document.getElementById('widget-root');
if (widgetRootElement) {
    ReactDOM.render(<DashboardPdfWidget />, widgetRootElement);
} else {
    console.error('Widget root element not found');
}