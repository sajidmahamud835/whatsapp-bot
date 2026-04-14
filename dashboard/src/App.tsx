import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Providers } from './components/providers';
import { AppLayout } from './components/layout/app-layout';
import Login from './pages/login';
import Dashboard from './pages/dashboard';
import Clients from './pages/clients/index';
import Messages from './pages/messages/index';
import Contacts from './pages/contacts/index';
import Templates from './pages/templates/index';
import Campaigns from './pages/campaigns/index';
import Flows from './pages/flows/index';
import FlowBuilder from './pages/flows/builder';
import Analytics from './pages/analytics/index';
import Webhooks from './pages/webhooks/index';
import CronJobs from './pages/cron/index';
import AIConfig from './pages/ai-config/index';
import SettingsPage from './pages/settings/index';

export default function App() {
  return (
    <Providers>
      <BrowserRouter basename="/dashboard">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/contacts" element={<Contacts />} />
            <Route path="/templates" element={<Templates />} />
            <Route path="/campaigns" element={<Campaigns />} />
            <Route path="/flows" element={<Flows />} />
            <Route path="/flows/:id" element={<FlowBuilder />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/webhooks" element={<Webhooks />} />
            <Route path="/cron" element={<CronJobs />} />
            <Route path="/ai-config" element={<AIConfig />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </Providers>
  );
}
