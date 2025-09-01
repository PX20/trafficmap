interface MapLegendProps {
  sidebarOpen?: boolean;
}

export function MapLegend({ sidebarOpen = false }: MapLegendProps) {
  return (
    <div className={`absolute bottom-6 p-4 rounded-lg shadow-lg border border-border z-20 hidden md:block bg-card/95 backdrop-blur-sm transition-all duration-300 ${
      sidebarOpen ? 'left-96' : 'left-6'
    }`}>
      <h4 className="text-sm font-medium text-foreground mb-3">Legend</h4>
      <div className="space-y-2">
        <div className="text-xs font-medium text-foreground mb-1">Traffic Events</div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          <span className="text-xs text-muted-foreground">Crashes</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
          <span className="text-xs text-muted-foreground">Hazards</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
          <span className="text-xs text-muted-foreground">Restrictions</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
          <span className="text-xs text-muted-foreground">Cameras</span>
        </div>
        
        <div className="text-xs font-medium text-foreground mb-1 mt-3">Safety & Emergency</div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-red-600 rounded-full"></div>
          <span className="text-xs text-muted-foreground">Official Emergencies</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-purple-600 rounded-full"></div>
          <span className="text-xs text-muted-foreground">Crime Reports</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-amber-600 rounded-full"></div>
          <span className="text-xs text-muted-foreground">Suspicious Activity</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-indigo-600 rounded-full"></div>
          <span className="text-xs text-muted-foreground">Other Emergencies</span>
        </div>
      </div>
    </div>
  );
}
