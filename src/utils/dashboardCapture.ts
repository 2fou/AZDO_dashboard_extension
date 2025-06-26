export const captureDashboardVisualContent = async (): Promise<HTMLElement | null> => {
    const possibleSelectors = [
        '.dashboard-container',
        '[data-testid="dashboard-container"]',
        '.dashboard-content',
        '.dashboard-canvas',
        '.dashboard-grid',
        '.grid-container',
        '[class*="dashboard"]',
        'main[role="main"]'
    ];
    
    for (const selector of possibleSelectors) {
        const element = document.querySelector(selector) as HTMLElement;
        if (element && element.offsetHeight > 0) {
            return element;
        }
    }
    
    const widgetsContainer = document.querySelector('[class*="widget"]') as HTMLElement;
    if (widgetsContainer) {
        let parent = widgetsContainer.parentElement;
        while (parent && parent !== document.body) {
            if (parent.children.length > 1) {
                return parent;
            }
            parent = parent.parentElement;
        }
    }
    
    return null;
};

export const waitForDashboardToLoad = async (): Promise<void> => {
    const maxWaitTime = 10000;
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
        const loadingElements = document.querySelectorAll(
            '.loading, [class*="loading"], .spinner, [class*="spinner"], [aria-busy="true"]'
        );
        
        if (loadingElements.length === 0) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            break;
        }
        
        await new Promise(resolve => setTimeout(resolve, 500));
    }
};
