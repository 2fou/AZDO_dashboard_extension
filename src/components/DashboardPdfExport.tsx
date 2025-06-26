import React, { useState, useEffect, useCallback } from 'react';
import { DashboardRestClient, Dashboard } from "azure-devops-extension-api/Dashboard";
import { getClient } from "azure-devops-extension-api";
import * as SDK from "azure-devops-extension-sdk";
// CORRECTION : Importer TeamContext depuis Core
import { TeamContext } from "azure-devops-extension-api/Core";
import { captureDashboardVisualContent, waitForDashboardToLoad } from '../utils/dashboardCapture';
import { generatePDFFromCanvas, generateMetadataPDF } from '../utils/pdfGenerator';
import html2canvas from 'html2canvas';

interface DashboardPdfExportProps {
    dashboardId?: string;
}

interface StatusMessage {
    message: string;
    type: 'info' | 'success' | 'error' | '';
}

const DashboardPdfExport: React.FC<DashboardPdfExportProps> = ({ dashboardId: propDashboardId }) => {
    const [dashboards, setDashboards] = useState<Dashboard[]>([]);
    const [selectedDashboardId, setSelectedDashboardId] = useState<string>(propDashboardId ?? '');
    const [status, setStatus] = useState<StatusMessage>({ message: '', type: '' });
    const [previewData, setPreviewData] = useState<Dashboard | null>(null);
    const [includeWidgets, setIncludeWidgets] = useState<boolean>(true);
    const [includeHeader, setIncludeHeader] = useState<boolean>(true);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [teamContext, setTeamContext] = useState<TeamContext | null>(null);

    const dashboardClient = getClient(DashboardRestClient);

    useEffect(() => {
        const initialize = async () => {
            try {
                await SDK.init();
                await setupTeamContext();
                await loadDashboards();
            } catch (error) {
                showStatus(`Erreur d'initialisation: ${error}`, 'error');
            }
        };
        initialize();
    }, []);

    const setupTeamContext = async () => {
        const webContext = SDK.getWebContext();

        // CORRECTION : Construire le TeamContext selon la documentation officielle
        const context: TeamContext = {
            project: webContext.project.name,
            projectId: webContext.project.id,
            team: webContext.team?.name || '',
            teamId: webContext.team?.id || ''
        };

        setTeamContext(context);
    };

    const showStatus = useCallback((message: string, type: StatusMessage['type']) => {
        setStatus({ message, type });
        if (type === 'success') {
            setTimeout(() => {
                setStatus({ message: '', type: '' });
            }, 3000);
        }
    }, []);

    const loadDashboards = async () => {
        if (!teamContext) {
            showStatus('Contexte de l\'équipe non disponible', 'error');
            return;
        }

        try {
            // CORRECTION : Utiliser getDashboardsByProject avec TeamContext
            const dashboardsResponse = await dashboardClient.getDashboardsByProject(teamContext);

            // La réponse est directement un tableau de Dashboard
            setDashboards(dashboardsResponse || []);

            if (dashboardsResponse.length === 0) {
                showStatus('Aucun dashboard trouvé pour cette équipe', 'info');
            }
        } catch (error) {
            showStatus(`Échec du chargement des dashboards: ${error}`, 'error');
        }
    };

    const getDashboardData = async (dashboardId: string): Promise<Dashboard> => {
        if (!teamContext) {
            throw new Error('Contexte de l\'équipe non disponible');
        }

        // CORRECTION : Utiliser getDashboard avec TeamContext et dashboardId
        return await dashboardClient.getDashboard(teamContext, dashboardId);
    };

    const handlePreview = async () => {
        if (!selectedDashboardId) {
            showStatus('Veuillez sélectionner un dashboard', 'error');
            return;
        }

        setIsLoading(true);
        try {
            showStatus('Chargement de l\'aperçu...', 'info');
            const dashboardData = await getDashboardData(selectedDashboardId);
            setPreviewData(dashboardData);
            showStatus('Aperçu chargé avec succès', 'success');
        } catch (error) {
            showStatus(`Échec de l'aperçu: ${error}`, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleExport = async () => {
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
            showStatus(`Échec de l'export: ${error}`, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const exportDashboardToPDF = async (dashboardId: string) => {
        try {
            // Obtenir les données du dashboard sélectionné
            const dashboardData = await getDashboardData(dashboardId);

            // Tenter de capturer le contenu visuel
            const dashboardElement = await captureDashboardVisualContent();

            if (!dashboardElement) {
                // Fallback vers un PDF basé sur les métadonnées
                await generateMetadataPDF(dashboardData, includeHeader, includeWidgets);
                return;
            }

            // Attendre que le dashboard soit complètement chargé
            await waitForDashboardToLoad();

            // Capturer le dashboard en tant qu'image
            const canvas = await html2canvas(dashboardElement, {
                allowTaint: true,
                useCORS: true,
                scale: 2,
                scrollX: 0,
                scrollY: 0,
                width: dashboardElement.scrollWidth,
                height: dashboardElement.scrollHeight,
                backgroundColor: '#ffffff',
                onclone: function (clonedDoc) {
                    const clonedElement = clonedDoc.querySelector('.dashboard-container') ||
                        clonedDoc.querySelector('[data-testid="dashboard-container"]') ||
                        clonedDoc.querySelector('.dashboard-content');
                    if (clonedElement && clonedElement instanceof HTMLElement) {
                        clonedElement.style.overflow = 'visible';
                        clonedElement.style.height = 'auto';
                    }
                }
            });

            // Générer le PDF à partir du canvas
            await generatePDFFromCanvas(canvas, dashboardData);

        } catch (error) {
            console.error('Échec de la capture du dashboard:', error);
            // Fallback vers un PDF basé sur les métadonnées
            const dashboardData = await getDashboardData(dashboardId);
            await generateMetadataPDF(dashboardData, includeHeader, includeWidgets);
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
                    </label>                </div>
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
                    <div className="dashboard-preview">
                        <div className="dashboard-info">
                            <h4>Informations du Dashboard</h4>
                            <p><strong>Nom:</strong> {previewData.name}</p>
                            <p><strong>Description:</strong> {previewData.description || 'Aucune description'}</p>
                            <p><strong>Nombre de widgets:</strong> {previewData.widgets?.length || 0}</p>
                            {/* CORRECTION : Utiliser ownerId au lieu de ownedBy?.displayName */}
                            <p><strong>Propriétaire (ID):</strong> {previewData.ownerId || 'Non spécifié'}</p>
                            <p><strong>Modifié par (ID):</strong> {previewData.modifiedBy || 'Non spécifié'}</p>
                            <p><strong>Dernière modification:</strong> {
                                previewData.lastAccessedDate ?
                                    new Date(previewData.lastAccessedDate).toLocaleDateString('fr-FR') :
                                    'Non disponible'
                            }</p>
                            {/* Correction pour modifiedDate si disponible */}
                            <p><strong>Date de modification:</strong> {
                                previewData.modifiedDate ?
                                    new Date(previewData.modifiedDate).toLocaleDateString('fr-FR') :
                                    'Non disponible'
                            }</p>
                        </div>

                        {previewData.widgets && previewData.widgets.length > 0 && (
                            <div className="widgets-preview">
                                <h4>Widgets</h4>
                                <div className="widgets-grid">
                                    {previewData.widgets.map((widget, index) => (
                                        <div key={widget.id || index} className="widget-preview">
                                            <h5>{widget.name}</h5>
                                            <p><strong>Taille:</strong> {widget.size.columnSpan}x{widget.size.rowSpan}</p>
                                            <p><strong>Position:</strong> ({widget.position.column}, {widget.position.row})</p>
                                            <p><strong>Type:</strong> {widget.contributionId}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

        </div>
    );
};

export default DashboardPdfExport;