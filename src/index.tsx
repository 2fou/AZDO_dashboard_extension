import React from 'react';
import ReactDOM from 'react-dom/client';
import * as SDK from 'azure-devops-extension-sdk';
import DashboardPdfExport from './components/DashboardPdfExport';
import './styles/extension.css';

SDK.init().then(() => {
    const root = ReactDOM.createRoot(document.getElementById('root')!);
    root.render(<DashboardPdfExport />);
});
