import { Route, Switch } from "wouter";
import { Provider } from "./components/provider";
import MapPage from "./pages/MapPage";
import MonitorPage from "./pages/MonitorPage";
import HistoryPage from "./pages/HistoryPage";
import Sidebar from "./components/Sidebar";

function App() {
  return (
    <Provider>
      <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-mono">
        <Sidebar />
        <div className="flex-1 overflow-hidden flex flex-col min-w-0">
          <Switch>
            <Route path="/" component={MapPage} />
            <Route path="/monitor" component={MonitorPage} />
            <Route path="/history" component={HistoryPage} />
          </Switch>
        </div>
      </div>
    </Provider>
  );
}

export default App;
