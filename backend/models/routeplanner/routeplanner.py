import osmnx as ox
import networkx as nx
import folium

def get_route_map(source_lat, source_lon, destination_lat, destination_lon, bbox=(8.0, 13.0, 77.0, 80.0)):
    # Get the graph for the defined area
    graph = ox.graph_from_bbox(*bbox, network_type='all')
    
    # Define function to get nearest node
    def get_nearest_node(lat, lon, graph):
        return ox.distance.nearest_nodes(graph, X=lon, Y=lat)
    
    # Get nearest nodes to source and destination
    source_node = get_nearest_node(source_lat, source_lon, graph)
    destination_node = get_nearest_node(destination_lat, destination_lon, graph)
    
    # Calculate the route
    route = nx.shortest_path(graph, source=source_node, target=destination_node, weight='length')
    
    # Create a map centered on the source location
    m = folium.Map(location=[source_lat, source_lon], zoom_start=8)
    
    # Plot the route on the map
    route_coords = [(graph.nodes[node]['y'], graph.nodes[node]['x']) for node in route]
    folium.PolyLine(route_coords, color='blue', weight=3).add_to(m)
    
    # Save the map to an HTML file
    map_filename = "static/route_planner_map.html"
    m.save(map_filename)
    
    return map_filename  # Return the path to the saved map

# Example usage
if __name__ == "__main__":
    source_lat, source_lon = 13.0827, 80.2707  # Chennai
    destination_lat, destination_lon = 12.9716, 77.5946  # Bengaluru
    map_file = get_route_map(source_lat, source_lon, destination_lat, destination_lon)
    print(f"Route map saved at {map_file}")
