// src/widget.tsx
import React from 'react';
import ReactDOM from 'react-dom';
import DashboardPdfWidget from './components/DashboardPdfWidget';
import './styles/extension.css';

const widgetRootElement = document.getElementById('widget-root');

if (widgetRootElement) {
    ReactDOM.render(<DashboardPdfWidget />, widgetRootElement);
}
else {
    console.error('Widget root element not found');
}   