// src/widget.tsx

import React from 'react';
import ReactDOM from 'react-dom'; // Updated import
import DashboardPdfWidget from './components/DashboardPdfWidget';
import './styles/extension.css';

const widgetRootElement = document.getElementById('widget-root'); // Check if element exists
if (widgetRootElement) {
    ReactDOM.render(<DashboardPdfWidget />, widgetRootElement);
}