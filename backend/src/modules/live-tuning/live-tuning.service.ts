import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LiveTuning, TuningType } from '../../database/entities/live-tuning.entity';

@Injectable()
export class LiveTuningService {
  constructor(
    @InjectRepository(LiveTuning)
    private tuningRepository: Repository<LiveTuning>,
  ) {}

  async create(data: {
    key: string;
    value: string;
    type: TuningType;
    description?: string;
  }): Promise<LiveTuning> {
    const existing = await this.tuningRepository.findOne({ where: { key: data.key } });
    if (existing) {
      throw new ConflictException(`Tuning key "${data.key}" already exists`);
    }

    const tuning = this.tuningRepository.create(data);
    return this.tuningRepository.save(tuning);
  }

  async findAll(): Promise<LiveTuning[]> {
    return this.tuningRepository.find({ order: { key: 'ASC' } });
  }

  async findOne(id: string): Promise<LiveTuning> {
    const tuning = await this.tuningRepository.findOne({ where: { id } });
    if (!tuning) {
      throw new NotFoundException('Tuning variable not found');
    }
    return tuning;
  }

  async update(
    id: string,
    data: { key?: string; value?: string; type?: TuningType; description?: string; isActive?: boolean },
  ): Promise<LiveTuning> {
    const tuning = await this.findOne(id);

    if (data.key && data.key !== tuning.key) {
      const existing = await this.tuningRepository.findOne({ where: { key: data.key } });
      if (existing) {
        throw new ConflictException(`Tuning key "${data.key}" already exists`);
      }
    }

    Object.assign(tuning, data);
    return this.tuningRepository.save(tuning);
  }

  async remove(id: string): Promise<void> {
    const tuning = await this.findOne(id);
    await this.tuningRepository.remove(tuning);
  }

  async getPublicTuning(): Promise<Record<string, any>> {
    const variables = await this.tuningRepository.find({
      where: { isActive: true },
      order: { key: 'ASC' },
    });

    const result: Record<string, any> = {};
    for (const v of variables) {
      switch (v.type) {
        case TuningType.NUMBER:
          result[v.key] = Number(v.value);
          break;
        case TuningType.BOOLEAN:
          result[v.key] = v.value === 'true' || v.value === '1';
          break;
        case TuningType.JSON:
          try {
            result[v.key] = JSON.parse(v.value);
          } catch {
            result[v.key] = v.value;
          }
          break;
        default:
          result[v.key] = v.value;
      }
    }
    return result;
  }

  async validateValue(type: TuningType, value: string): Promise<boolean> {
    switch (type) {
      case TuningType.NUMBER:
        return !isNaN(Number(value));
      case TuningType.BOOLEAN:
        return value === 'true' || value === 'false' || value === '1' || value === '0';
      case TuningType.JSON:
        try {
          JSON.parse(value);
          return true;
        } catch {
          return false;
        }
      default:
        return true;
    }
  }
}