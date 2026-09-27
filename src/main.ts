import { registerLocaleData } from '@angular/common';
import localeEsCl from '@angular/common/locales/es-CL';
import { bootstrapApplication } from '@angular/platform-browser';

import { App } from './app/app';
import { appConfig } from './app/app.config';

registerLocaleData(localeEsCl);

bootstrapApplication(App, appConfig).catch((err) => console.error(err));
