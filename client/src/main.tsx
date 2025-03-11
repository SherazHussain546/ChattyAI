import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// Import Ionic PWA elements for native features
import { defineCustomElements } from '@ionic/pwa-elements/loader';
defineCustomElements(window);

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
