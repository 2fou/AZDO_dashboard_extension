import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { DashboardRestClient, Dashboard } from "azure-devops-extension-api/Dashboard";
import { CoreRestClient } from "azure-devops-extension-api/Core";
import { CommonServiceIds, ILocationService, IProjectPageService } from "azure-devops-extension-api";
import { getClient } from "azure-devops-extension-api";
import * as SDK from "azure-devops-extension-sdk";
import { TeamContext } from "azure-devops-extension-api/Core";
import '../styles/styles.css';

const DashboardPdfPage: React.FC = () => {
    const [dashboards, setDashboards] = useState<Dashboard[]>([]);
    const [selectedDashboardId, setSelectedDashboardId] = useState<string>('');
    const [status, setStatus] = useState<{ message: string; type: 'info' | 'success' | 'error' }>({ message: '', type: 'info' });
    const [previewData, setPreviewData] = useState<Dashboard | null>(null);
    const [includeWidgets, setIncludeWidgets] = useState<boolean>(true);
    const [includeHeader, setIncludeHeader] = useState<boolean>(true);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [teamContext, setTeamContext] = useState<TeamContext | null>(null);
    const [baseUrl, setBaseUrl] = useState<string>('');

    const dashboardClient = getClient(DashboardRestClient);

    // Enhanced function to get organization base URL using LocationService
    const getOrganizationBaseUrl = async (): Promise<string> => {
        try {
            // Get the LocationService
            const locationService = await SDK.getService<ILocationService>('ms.vss-features.location-service');

            // Get the base URL using CoreRestClient.RESOURCE_AREA_ID
            const orgUrl = await locationService.getResourceAreaLocation(CoreRestClient.RESOURCE_AREA_ID);

            console.log('Organization URL:', orgUrl);

            return orgUrl;
        } catch (error) {
            console.error('Error getting organization URL:', error);
            throw error;
        }
    };

    // Enhanced function to get project information
    const getProjectInfo = async () => {
        try {
            const projectService = await SDK.getService<IProjectPageService>(CommonServiceIds.ProjectPageService);
            
            const project = await projectService.getProject();

            if (!project) {
                throw new Error('Could not retrieve project information');
            }

            return project;
        } catch (error) {
            console.error('Error getting project info:', error);
            throw error;
        }
    };
    // Function to build dashboard URL
    const buildDashboardUrl = (baseUrl: string, projectName: string, dashboardId: string): string => {
        // Remove trailing slash if it exists
        const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
        return `${cleanBaseUrl}/${projectName}/_dashboards/dashboard/${dashboardId}`;
    };

    useEffect(() => {
        SDK.init();

        const initialize = async () => {
            try {
                await SDK.ready();

                // Get organization base URL
                const orgBaseUrl = await getOrganizationBaseUrl();

                // Get project information
                const project = await getProjectInfo();

                // Build team context
                const webContext = SDK.getWebContext();
                const context: TeamContext = {
                    project: project.name,
                    projectId: project.id,
                    team: webContext.team?.name || '',
                    teamId: webContext.team?.id || ''
                };

                setTeamContext(context);
                setBaseUrl(orgBaseUrl);

                console.log('Context initialized:', {
                    orgBaseUrl,
                    projectName: project.name,
                    projectId: project.id,
                    teamName: context.team,
                    teamId: context.teamId
                });

                // Load dashboards
                await loadDashboards(context);

                SDK.notifyLoadSucceeded();
            } catch (error) {
                console.error('Error during initialization:', error);
                showStatus(`Initialization error: ${error}`, 'error');
                SDK.notifyLoadFailed(error instanceof Error ? error : String(error));
            }
        };

        initialize();
    }, []);

    const showStatus = useCallback((message: string, type: 'info' | 'success' | 'error') => {
        setStatus({ message, type });
        if (type === 'success') {
            setTimeout(() => {
                setStatus({ message: '', type: 'info' });
            }, 3000);
        }
    }, []);

    const loadDashboards = async (context: TeamContext) => {
        try {
            const dashboardsResponse = await dashboardClient.getDashboardsByProject(context);
            setDashboards(dashboardsResponse || []);
            if (!dashboardsResponse || dashboardsResponse.length === 0) {
                showStatus('No dashboards found for this team', 'info');
            }
        } catch (error) {
            console.error('Error loading dashboards:', error);
            showStatus(`Failed to load dashboards: ${error}`, 'error');
        }
    };

    const handlePreview = async () => {
        if (!selectedDashboardId) {
            showStatus('Please select a dashboard', 'error');
            return;
        }

        setIsLoading(true);

        try {
            showStatus('Loading preview...', 'info');
            const dashboardData = await getDashboardData(selectedDashboardId);
            setPreviewData(dashboardData);
            showStatus('Preview loaded successfully', 'success');
        } catch (error) {
            console.error('Error in preview:', error);
            showStatus(`Preview failed: ${error}`, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const getDashboardData = async (dashboardId: string): Promise<Dashboard> => {
        if (!teamContext) {
            throw new Error('Team context not available');
        }
        return await dashboardClient.getDashboard(teamContext, dashboardId);
    };

    const constructDashboardUrl = (dashboardId: string): string => {
        if (!baseUrl || !teamContext?.project) {
            console.warn('Base URL or project context not available');
            return '';
        }

        const dashboardUrl = buildDashboardUrl(baseUrl, teamContext.project, dashboardId);
        console.log('Dashboard URL constructed:', dashboardUrl);

        return dashboardUrl;
    };

    // Function to handle export (keep your existing implementation)
    const handleExport = async () => {
        if (!selectedDashboardId) {
            showStatus('Please select a dashboard', 'error');
            return;
        }

        setIsLoading(true);

        try {
            showStatus('Generating PDF...', 'info');
            // Implement export logic here
            // ... your existing export code
            showStatus('PDF generated successfully', 'success');
        } catch (error) {
            console.error('Error in export:', error);
            showStatus(`Export failed: ${error}`, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <h1>Export PDF of Dashboards</h1>
                <p>Export your team dashboards to PDF format</p>
            </div>

            <div className="dashboard-selector">
                <label htmlFor="dashboardSelect">Select a Dashboard:</label>
                <select
                    id="dashboardSelect"
                    value={selectedDashboardId}
                    onChange={(e) => setSelectedDashboardId(e.target.value)}
                    className="form-control"
                    disabled={isLoading || dashboards.length === 0}
                >
                    <option value="">
                        {dashboards.length === 0 ? 'No dashboards available...' : 'Select a dashboard...'}
                    </option>
                    {dashboards.map(dashboard => (
                        <option key={dashboard.id} value={dashboard.id}>
                            {dashboard.name} ({dashboard.widgets?.length || 0} widgets)
                        </option>
                    ))}
                </select>
            </div>

            <div className="export-options">
                <div className="option-group">
                    <label>
                        <input
                            type="checkbox"
                            checked={includeWidgets}
                            onChange={(e) => setIncludeWidgets(e.target.checked)}
                            disabled={isLoading}
                        /> Include widget content
                    </label>
                </div>
                <div className="option-group">
                    <label>
                        <input
                            type="checkbox"
                            checked={includeHeader}
                            onChange={(e) => setIncludeHeader(e.target.checked)}
                            disabled={isLoading}
                        /> Include dashboard header
                    </label>
                </div>
            </div>

            <div className="action-buttons">
                <button
                    className="btn btn-secondary"
                    onClick={handlePreview}
                    disabled={!selectedDashboardId || isLoading}
                >
                    {isLoading ? 'Loading...' : 'Preview'}
                </button>
                <button
                    className="btn btn-primary"
                    onClick={handleExport}
                    disabled={!selectedDashboardId || isLoading}
                >
                    {isLoading ? 'Generating...' : 'Export to PDF'}
                </button>
            </div>

            {status.message && (
                <div className={`status-message ${status.type}`}>
                    {status.message}
                </div>
            )}

            {previewData && (
                <div className="preview-container">
                    <h3>Dashboard Preview: {previewData.name}</h3>
                    <iframe
                        id="dashboardIframe"
                        src={constructDashboardUrl(selectedDashboardId)}
                        style={{ width: '100%', height: '600px', border: 'none' }}
                        title="Dashboard Preview"
                    />
                </div>
            )}
        </div>
    );
};

const rootElement = document.getElementById('root');
if (rootElement) {
    ReactDOM.render(<DashboardPdfPage />, rootElement);
}