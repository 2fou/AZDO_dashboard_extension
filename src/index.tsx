// src/index.tsx

import React from 'react';
import ReactDOM from 'react-dom'; // Updated import
import DashboardPdfExport from './components/DashboardPdfExport';
import './styles/extension.css';

const rootElement = document.getElementById('root'); // Check if element exists
if (rootElement) {
    ReactDOM.render(<DashboardPdfExport />, rootElement);
}