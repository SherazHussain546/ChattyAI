import React, { useState, useEffect, useRef } from 'react';
import { IonApp, IonRouterOutlet, IonPage, IonContent, IonHeader, IonToolbar, IonTitle,
  IonFooter, IonInput, IonButton, IonList, IonItem, IonLabel, IonAvatar, IonIcon, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { Route } from 'react-router-dom';
import { send } from 'ionicons/icons';

/* Core CSS required for Ionic components to work properly */
import '@ionic/react/css/core.css';

/* Basic CSS for apps built with Ionic */
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

/* Optional CSS utils that can be commented out */
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';

/* Theme variables */
import './theme/variables.css';

// Import pages
import Home from './pages/Home';

setupIonicReact();

const App: React.FC = () => {
  return (
    <IonApp>
      <IonReactRouter>
        <IonRouterOutlet>
          <Route exact path="/" component={Home} />
        </IonRouterOutlet>
      </IonReactRouter>
    </IonApp>
  );
};

export default App;