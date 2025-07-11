import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { DashboardRestClient, Dashboard } from "azure-devops-extension-api/Dashboard";
import { getClient } from "azure-devops-extension-api";
import * as SDK from "azure-devops-extension-sdk";
import { TeamContext } from "azure-devops-extension-api/Core";
import { captureDashboardVisualContent, waitForDashboardToLoad } from '../utils/utils';
import { generatePDFFromCanvas } from '../utils/utils';

import html2canvas from 'html2canvas';
import '../styles/styles.css';

const DashboardPdfPage: React.FC = () => {
    const [dashboards, setDashboards] = useState<Dashboard[]>([]);
    const [selectedDashboardId, setSelectedDashboardId] = useState<string>('');
    const [status, setStatus] = useState<{ message: string, type: 'info' | 'success' | 'error' }>({ message: '', type: 'info' });
    const [previewData, setPreviewData] = useState<Dashboard | null>(null);
    const [includeWidgets, setIncludeWidgets] = useState<boolean>(true);
    const [includeHeader, setIncludeHeader] = useState<boolean>(true);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [teamContext, setTeamContext] = useState<TeamContext | null>(null);

    console.log('Initialized DashboardPdfPage component');

    const dashboardClient = getClient(DashboardRestClient);
    console.log('DashboardRestClient initialized', dashboardClient);

    useEffect(() => {
        SDK.init();
        const initialize = async () => {
            try {
                await SDK.ready();
                console.log('SDK is ready');
                const webContext = SDK.getWebContext();
                console.log('Web context:', webContext);

                if (!webContext?.project?.id) {
                    throw new Error('Web context is missing required project information');
                }
                const context: TeamContext = {
                    project: webContext.project.name,
                    projectId: webContext.project.id,
                    team: webContext.team?.name || '',
                    teamId: webContext.team?.id || ''
                };

                console.log('TeamContext:', context);

                setTeamContext((prevContext) =>
                    prevContext?.projectId === context.projectId && prevContext?.teamId === context.teamId
                        ? prevContext
                        : context
                );

                await loadDashboards(context);
                SDK.notifyLoadSucceeded();
            } catch (error) {
                console.error('Error during initialization:', error);
                showStatus(`Erreur d'initialisation: ${error}`, 'error');
            }
        };
        initialize();
    }, []); // Run once on component mount

    const showStatus = useCallback((message: string, type: 'info' | 'success' | 'error') => {
        console.log('Status update:', message, type);
        setStatus({ message, type });
        if (type === 'success') {
            setTimeout(() => {
                setStatus({ message: '', type: 'info' });
            }, 3000);
        }
    }, []);

    const loadDashboards = async (context: TeamContext) => {
        console.log('Loading dashboards for context:', context);
        try {
            const dashboardsResponse = await dashboardClient.getDashboardsByProject(context);
            console.log('Dashboards loaded:', dashboardsResponse);
            setDashboards(dashboardsResponse || []);
            if (!dashboardsResponse || dashboardsResponse.length === 0) {
                showStatus('Aucun dashboard trouvé pour cette équipe', 'info');
            }
        } catch (error) {
            console.error('Error loading dashboards:', error);
            showStatus(`Échec du chargement des dashboards: ${error}`, 'error');
        }
    };

    const getDashboardData = async (dashboardId: string): Promise<Dashboard> => {
        if (!teamContext) {
            throw new Error('Contexte de l\'équipe non disponible');
        }
        console.log('Fetching dashboard data for ID:', dashboardId);
        return await dashboardClient.getDashboard(teamContext, dashboardId);
    };

    const handlePreview = async () => {
        console.log('Preview triggered for dashboard ID:', selectedDashboardId);
        if (!selectedDashboardId) {
            showStatus('Veuillez sélectionner un dashboard', 'error');
            return;
        }
        setIsLoading(true);
        try {
            showStatus('Chargement de l\'aperçu...', 'info');
            const dashboardData = await getDashboardData(selectedDashboardId);
            console.log('Dashboard data for preview:', dashboardData);
            setPreviewData(dashboardData);
            showStatus('Aperçu chargé avec succès', 'success');
        } catch (error) {
            console.error('Error fetching dashboard for preview:', error);
            showStatus(`Échec de l'aperçu: ${error}`, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleExport = async () => {
        console.log('Export triggered for dashboard ID:', selectedDashboardId);
        if (!selectedDashboardId) {
            showStatus('Veuillez sélectionner un dashboard', 'error');
            return;
        }
        setIsLoading(true);
        try {
            showStatus('Génération du PDF...', 'info');
            await exportDashboardToPDF(selectedDashboardId);
            showStatus('PDF exporté avec succès!', 'success');
        } catch (error) {
            console.error('Error during PDF export:', error);
            showStatus(`Échec de l'export: ${error}`, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const exportDashboardToPDF = async (dashboardId: string) => {
        console.log('Starting PDF export for dashboard ID:', dashboardId);
        try {
            const dashboardData = await getDashboardData(dashboardId);
            console.log('Dashboard data for export:', dashboardData);
            const dashboardElement = await captureDashboardVisualContent();
            if (!dashboardElement) {
                throw new Error("Impossible de trouver l'élément du dashboard à capturer.");
            }
            console.log('Dashboard element captured:', dashboardElement);
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
            console.log('Canvas rendered:', canvas);
            await generatePDFFromCanvas(canvas, dashboardData);
        } catch (error) {
            console.error('Error capturing and exporting dashboard:', error);
        }
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <h1>Export PDF des Dashboards</h1>
                <p>Exportez vos dashboards d'équipe au format PDF</p>
            </div>
            <div className="dashboard-selector">
                <label htmlFor="dashboardSelect">Sélectionner un Dashboard:</label>
                <select
                    id="dashboardSelect"
                    value={selectedDashboardId}
                    onChange={(e) => setSelectedDashboardId(e.target.value)}
                    className="form-control"
                    disabled={isLoading || dashboards.length === 0}
                >
                    <option value="">
                        {dashboards.length === 0 ? 'Aucun dashboard disponible...' : 'Sélectionner un dashboard...'}
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
                        /> Inclure le contenu des widgets
                    </label>
                </div>
                <div className="option-group">
                    <label>
                        <input
                            type="checkbox"
                            checked={includeHeader}
                            onChange={(e) => setIncludeHeader(e.target.checked)}
                            disabled={isLoading} />
                        Inclure l'en-tête du dashboard
                    </label>
                </div>
            </div>
            <div className="action-buttons">
                <button
                    className="btn btn-secondary"
                    onClick={handlePreview}
                    disabled={!selectedDashboardId || isLoading}
                >
                    {isLoading ? 'Chargement...' : 'Aperçu'}
                </button>
                <button
                    className="btn btn-primary"
                    onClick={handleExport}
                    disabled={!selectedDashboardId || isLoading}
                >
                    {isLoading ? 'Génération...' : 'Exporter en PDF'}
                </button>
            </div>
            {status.message && (
                <div className={`status-message ${status.type}`}>
                    {status.message}
                </div>
            )}
            {previewData && (
                <div className="preview-container">
                    <h3>Aperçu du Dashboard: {previewData.name}</h3>
                    {/* Dashboard preview details */}
                </div>
            )}
        </div>
    );
};

const rootElement = document.getElementById('root');
if (rootElement) {
    ReactDOM.render(<DashboardPdfPage />, rootElement);
}