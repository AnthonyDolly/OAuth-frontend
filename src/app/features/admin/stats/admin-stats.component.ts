import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AdminService } from '../../../core/services/admin.service';
import { AdminStats } from '../../../core/interfaces/admin.interface';

@Component({
  selector: 'app-admin-stats',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-stats.component.html',
  styleUrls: ['./admin-stats.component.css']
})
export class AdminStatsComponent implements OnInit {
  private readonly adminService = inject(AdminService);

  stats: AdminStats | null = null;
  loading = true;
  error = '';

  ngOnInit(): void {
    this.loadStats();
  }

  private loadStats(): void {
    this.loading = true;
    this.error = '';

    this.adminService.getStats().subscribe({
      next: (stats) => {
        this.stats = stats;
        this.loading = false;
      },
      error: (error) => {
        this.loading = false;
        this.error = 'Error cargando estadísticas';
      }
    });
  }

  refreshStats(): void {
    this.loadStats();
  }

  getOAuthRatio(): number {
    if (!this.stats || this.stats.userCount === 0) return 0;
    return Math.round((this.stats.oauthCount / this.stats.userCount) * 100);
  }

  getSessionHealthStatus(): string {
    if (!this.stats) return 'status-good';
    const ratio = this.stats.activeSessions / this.stats.userCount;
    return ratio > 0.5 ? 'status-warning' : 'status-good';
  }

  getSessionHealthIcon(): string {
    if (!this.stats) return '✅';
    const ratio = this.stats.activeSessions / this.stats.userCount;
    return ratio > 0.5 ? '⚠️' : '✅';
  }

  getSessionHealthText(): string {
    if (!this.stats) return 'Normal';
    const ratio = this.stats.activeSessions / this.stats.userCount;
    return ratio > 0.5 ? 'Alto tráfico detectado' : 'Tráfico normal';
  }
}
