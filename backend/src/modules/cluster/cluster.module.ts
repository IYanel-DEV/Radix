import { Module } from '@nestjs/common';
import { ClusterGateway } from './cluster.gateway';
import { ClusterService } from './cluster.service';

@Module({
  providers: [ClusterGateway, ClusterService],
  exports: [ClusterService],
})
export class ClusterModule {}
