import React from 'react'
import ReactDOM from 'react-dom/client'
import FlowchartDiagram from '../odoo-clinic-flowchart.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <FlowchartDiagram />
  </React.StrictMode>,
)

