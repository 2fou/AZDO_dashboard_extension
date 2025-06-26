import React from 'react';
import ReactDOM from 'react-dom/client';
import * as SDK from 'azure-devops-extension-sdk';
import DashboardPdfWidget from './components/DashboardPdfWidget';
import './styles/extension.css';

SDK.init().then(() => {
    const root = ReactDOM.createRoot(document.getElementById('widget-root')!);
    root.render(<DashboardPdfWidget />);
});
