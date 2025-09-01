import { type User, type InsertUser, type TrafficEvent, type TrafficCamera, type InsertTrafficEvent, type InsertTrafficCamera, type Incident, type InsertIncident, type WeatherStation, type InsertWeatherStation } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getTrafficEvents(): Promise<TrafficEvent[]>;
  createTrafficEvent(event: InsertTrafficEvent): Promise<TrafficEvent>;
  updateTrafficEvent(id: string, event: Partial<TrafficEvent>): Promise<TrafficEvent | undefined>;
  deleteTrafficEvent(id: string): Promise<boolean>;
  getTrafficCameras(): Promise<TrafficCamera[]>;
  createTrafficCamera(camera: InsertTrafficCamera): Promise<TrafficCamera>;
  updateTrafficCamera(id: string, camera: Partial<TrafficCamera>): Promise<TrafficCamera | undefined>;
  deleteTrafficCamera(id: string): Promise<boolean>;
  getIncidents(): Promise<Incident[]>;
  createIncident(incident: InsertIncident): Promise<Incident>;
  updateIncident(id: string, incident: Partial<Incident>): Promise<Incident | undefined>;
  deleteIncident(id: string): Promise<boolean>;
  getWeatherStations(): Promise<WeatherStation[]>;
  createWeatherStation(station: InsertWeatherStation): Promise<WeatherStation>;
  updateWeatherStation(id: string, station: Partial<WeatherStation>): Promise<WeatherStation | undefined>;
  deleteWeatherStation(id: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private trafficEvents: Map<string, TrafficEvent>;
  private trafficCameras: Map<string, TrafficCamera>;
  private incidents: Map<string, Incident>;
  private weatherStations: Map<string, WeatherStation>;

  constructor() {
    this.users = new Map();
    this.trafficEvents = new Map();
    this.trafficCameras = new Map();
    this.incidents = new Map();
    this.weatherStations = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getTrafficEvents(): Promise<TrafficEvent[]> {
    return Array.from(this.trafficEvents.values());
  }

  async createTrafficEvent(event: InsertTrafficEvent): Promise<TrafficEvent> {
    const id = randomUUID();
    const trafficEvent: TrafficEvent = {
      ...event,
      id,
      lastUpdated: new Date(),
      description: event.description || null,
      eventSubtype: event.eventSubtype || null,
      advice: event.advice || null,
      information: event.information || null,
      webLink: event.webLink || null,
      alertMessage: event.alertMessage || null,
    };
    this.trafficEvents.set(id, trafficEvent);
    return trafficEvent;
  }

  async updateTrafficEvent(id: string, event: Partial<TrafficEvent>): Promise<TrafficEvent | undefined> {
    const existing = this.trafficEvents.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...event, lastUpdated: new Date() };
    this.trafficEvents.set(id, updated);
    return updated;
  }

  async deleteTrafficEvent(id: string): Promise<boolean> {
    return this.trafficEvents.delete(id);
  }

  async getTrafficCameras(): Promise<TrafficCamera[]> {
    return Array.from(this.trafficCameras.values());
  }

  async createTrafficCamera(camera: InsertTrafficCamera): Promise<TrafficCamera> {
    const id = randomUUID();
    const trafficCamera: TrafficCamera = {
      ...camera,
      id,
      lastUpdated: new Date(),
      location: camera.location || null,
      imageUrl: camera.imageUrl || null,
    };
    this.trafficCameras.set(id, trafficCamera);
    return trafficCamera;
  }

  async updateTrafficCamera(id: string, camera: Partial<TrafficCamera>): Promise<TrafficCamera | undefined> {
    const existing = this.trafficCameras.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...camera, lastUpdated: new Date() };
    this.trafficCameras.set(id, updated);
    return updated;
  }

  async deleteTrafficCamera(id: string): Promise<boolean> {
    return this.trafficCameras.delete(id);
  }

  async getIncidents(): Promise<Incident[]> {
    return Array.from(this.incidents.values());
  }

  async createIncident(incident: InsertIncident): Promise<Incident> {
    const id = randomUUID();
    const newIncident: Incident = {
      ...incident,
      id,
      lastUpdated: new Date(),
      description: incident.description || null,
      location: incident.location || null,
      priority: incident.priority || null,
      agency: incident.agency || null,
      publishedDate: incident.publishedDate || null,
    };
    this.incidents.set(id, newIncident);
    return newIncident;
  }

  async updateIncident(id: string, incident: Partial<Incident>): Promise<Incident | undefined> {
    const existing = this.incidents.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...incident, lastUpdated: new Date() };
    this.incidents.set(id, updated);
    return updated;
  }

  async deleteIncident(id: string): Promise<boolean> {
    return this.incidents.delete(id);
  }

  async getWeatherStations(): Promise<WeatherStation[]> {
    return Array.from(this.weatherStations.values());
  }

  async createWeatherStation(station: InsertWeatherStation): Promise<WeatherStation> {
    const id = randomUUID();
    const newStation: WeatherStation = {
      ...station,
      id,
      lastUpdated: new Date(),
      temperature: station.temperature || null,
      humidity: station.humidity || null,
      weatherCode: station.weatherCode || null,
      windSpeed: station.windSpeed || null,
      windDirection: station.windDirection || null,
    };
    this.weatherStations.set(id, newStation);
    return newStation;
  }

  async updateWeatherStation(id: string, station: Partial<WeatherStation>): Promise<WeatherStation | undefined> {
    const existing = this.weatherStations.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...station, lastUpdated: new Date() };
    this.weatherStations.set(id, updated);
    return updated;
  }

  async deleteWeatherStation(id: string): Promise<boolean> {
    return this.weatherStations.delete(id);
  }
}

export const storage = new MemStorage();
