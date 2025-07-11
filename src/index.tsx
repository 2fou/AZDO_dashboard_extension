// src/index.tsx
import React from 'react';
import ReactDOM from 'react-dom';
import DashboardPdfExport from './components/DashboardPdfExport';
import './styles/extension.css';

const rootElement = document.getElementById('root');

if (rootElement) {
    ReactDOM.render(<DashboardPdfExport />, rootElement);
}
