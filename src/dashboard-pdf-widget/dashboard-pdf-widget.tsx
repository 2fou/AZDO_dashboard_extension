// dashboard-pdf-widget.tsx
import * as React from "react";
import * as SDK from "azure-devops-extension-sdk";
import {
  IConfigurableWidget,
  WidgetSettings,
  WidgetStatus,
  WidgetStatusHelper,
  DashboardRestClient,
  Dashboard,
} from "azure-devops-extension-api/Dashboard";
import {
  CommonServiceIds,
  IProjectPageService,
  getClient,
} from "azure-devops-extension-api";
import { CoreRestClient, TeamContext } from "azure-devops-extension-api/Core";
import {
  captureDashboardVisualContent,
  generatePDFFromCanvas,
  waitForDashboardToLoad,
} from "../utils/utils";
import html2canvas from "html2canvas";
import { showRootComponent } from "../common/common";

interface IProjectWidgetState {
  title: string;
  projectName: string;
  teamContext?: TeamContext;
}

class ProjectWidget
  extends React.Component<{}, IProjectWidgetState>
  implements IConfigurableWidget {
  constructor(props: {}) {
    super(props);
    this.state = { title: "", projectName: "" };
  }

  public async preload(_settings: WidgetSettings): Promise<WidgetStatus> {
    return WidgetStatusHelper.Success();
  }

  public componentDidMount() {
    console.log("Component did mount - starting SDK initialization");
    SDK.init()
      .then(() => {
        console.log("SDK initialization complete");
        // Register widget
        SDK.register("project-widget", this);
        console.log("Widget registered successfully");

        SDK.ready()
          .then(async () => {
            console.log("SDK ready");

            try {
              // Load project details
              const projectService = await SDK.getService<IProjectPageService>(
                CommonServiceIds.ProjectPageService
              );
              const project = await projectService.getProject();

              if (!project) {
                throw new Error("Project could not be fetched.");
              }

              this.setState({ projectName: project.name });
              console.log("Project details loaded:", project);

              // Construct team context - try multiple approaches
              const teamContext = await this.constructTeamContext(project.id, project.name);

              if (teamContext) {
                this.setState({ teamContext });
                console.log("Team context constructed:", teamContext);
              } else {
                console.warn("Could not construct team context");
              }

            } catch (err) {
              console.error("Error during initialization:", err);
              this.setState({ projectName: "Error loading project" });
            }


          })
          .catch((err) => {
            console.error("Error during SDK ready phase:", err);
          });
      })
      .catch((err) => {
        console.error("Error during SDK initialization:", err);
      });
  }

  private async constructTeamContext(projectId: string, projectName: string): Promise<TeamContext | null> {
    try {
      // Method 1: Try to get team from configuration (works in dashboard context)
      const config = SDK.getConfiguration();
      if (config && config.team) {
        return {
          projectId: projectId,
          project: projectName,
          teamId: config.team.id,
          team: config.team.name,
        };
      }

      // Method 2: Try to get team from SDK context (may not work in all contexts)
      try {
        const teamContext = SDK.getTeamContext();
        if (teamContext && teamContext.id) {
          return {
            projectId: projectId,
            project: projectName,
            teamId: teamContext.id,
            team: teamContext.name,
          };
        }
      } catch (teamError) {
        console.log("SDK.getTeamContext() not available in this context");
      }

      // Method 3: Get first available team from project
      const teams = await this.fetchTeams(projectId);
      if (teams.length > 0) {
        const defaultTeam = teams[0];
        return {
          projectId: projectId,
          project: projectName,
          teamId: defaultTeam.id,
          team: defaultTeam.name,
        };
      }

      return null;
    } catch (error) {
      console.error("Error constructing team context:", error);
      return null;
    }
  }

  private async fetchTeams(projectId: string) {
    const client = getClient(CoreRestClient);
    try {
      const teams = await client.getTeams(projectId);
      return teams;
    } catch (error) {
      console.error("Error fetching teams: ", error);
      return [];
    }
  }

  public async load(settings: WidgetSettings): Promise<WidgetStatus> {
    try {
      console.log("Loading widget with settings", settings);
      await this.setStateFromWidgetSettings(settings);
      return WidgetStatusHelper.Success();
    } catch (e) {
      console.error("Error loading widget:", e);
      return WidgetStatusHelper.Failure((e as any).toString());
    }
  }

  public async reload(settings: WidgetSettings): Promise<WidgetStatus> {
    return this.load(settings);
  }

  private async setStateFromWidgetSettings(settings: WidgetSettings) {
    this.setState({ title: settings.name });
  }

  private async resolveCurrentDashboard(): Promise<Dashboard | undefined> {
    console.log("Resolving current dashboard");

    if (!this.state.teamContext) {
      console.error("No team context available for dashboard resolution");
      return undefined;
    }

    try {
      const client = getClient(DashboardRestClient);
      const dashboards = await client.getDashboardsByProject(this.state.teamContext);

      // Since we can't easily determine which dashboard contains this widget,
      // we'll try to find it by examining the current page URL or return the first dashboard
      // This is a limitation of the current approach

      if (dashboards && dashboards.length > 0) {
        // Try to get dashboard from URL parameters or current context
        const currentUrl = window.location.href;
        const dashboardIdMatch = currentUrl.match(/dashboards\/([a-f0-9-]+)/i);

        if (dashboardIdMatch) {
          const dashboardId = dashboardIdMatch[1];
          const targetDashboard = dashboards.find(d => d.id === dashboardId);
          if (targetDashboard) {
            console.log("Found target dashboard from URL:", targetDashboard);
            return targetDashboard;
          }
        }

        // Fallback to first dashboard
        console.log("Using first available dashboard:", dashboards[0]);
        return dashboards[0];
      }

      console.warn("No dashboards found");
      return undefined;
    } catch (error) {
      console.error("Error resolving dashboard:", error);
      return undefined;
    }
  }

  private handleClick = async () => {
    console.log("Export PDF clicked");
    try {
      await waitForDashboardToLoad();

      const dashboard = await this.resolveCurrentDashboard();
      if (!dashboard) {
        alert("Unable to locate parent dashboard for this widget.");
        return;
      }

      const element = await captureDashboardVisualContent();
      if (!element) {
        alert("Failed to find dashboard content to capture.");
        return;
      }

      const canvas = await html2canvas(element, {
        allowTaint: true,
        useCORS: true,
        scale: 1,
        logging: false,
      });

      await generatePDFFromCanvas(canvas, dashboard);
      alert(`PDF generated for dashboard: ${dashboard.name}`);
    } catch (err) {
      console.error("PDF generation error:", err);
      alert("PDF generation failed – see console for details.");
    }
  };

  public render(): JSX.Element {
    return (
      <div className="widget">
        <div className="content">
          <h2 className="title">{this.state.title}</h2>
          <div className="project-name">{this.state.projectName}</div>
          <button onClick={this.handleClick} className="pdf-export-button">
            Export PDF
          </button>
        </div>
      </div>
    );
  }
}

showRootComponent(<ProjectWidget />, "widget-root");