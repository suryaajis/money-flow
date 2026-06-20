import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

const DEFAULT_CATEGORIES = [
  { name: 'Gaji', color: '#22c55e', icon: 'Banknote', type: 'income' as const },
  { name: 'Investasi', color: '#3b82f6', icon: 'TrendingUp', type: 'both' as const },
  { name: 'Makanan', color: '#f97316', icon: 'UtensilsCrossed', type: 'expense' as const },
  { name: 'Transportasi', color: '#8b5cf6', icon: 'Car', type: 'expense' as const },
  { name: 'Hiburan', color: '#ec4899', icon: 'Gamepad2', type: 'expense' as const },
  { name: 'Kesehatan', color: '#ef4444', icon: 'Heart', type: 'expense' as const },
  { name: 'Belanja', color: '#f59e0b', icon: 'ShoppingBag', type: 'expense' as const },
  { name: 'Tagihan', color: '#6b7280', icon: 'Receipt', type: 'expense' as const },
  { name: 'Lainnya', color: '#14b8a6', icon: 'MoreHorizontal', type: 'both' as const },
];

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  async seedDefaults(userId: string): Promise<void> {
    const existing = await this.categoryRepository.count({ where: { userId } });
    if (existing > 0) return;

    const defaults = DEFAULT_CATEGORIES.map((cat) =>
      this.categoryRepository.create({ ...cat, userId, isDefault: true }),
    );
    await this.categoryRepository.save(defaults);
  }

  async findAll(userId: string): Promise<Category[]> {
    return this.categoryRepository.find({
      where: { userId },
      order: { createdAt: 'ASC' },
    });
  }

  async create(userId: string, dto: CreateCategoryDto): Promise<Category> {
    const category = this.categoryRepository.create({ ...dto, userId, isDefault: false });
    return this.categoryRepository.save(category);
  }

  async update(userId: string, id: string, dto: UpdateCategoryDto): Promise<Category> {
    const category = await this.categoryRepository.findOne({ where: { id, userId } });
    if (!category) throw new NotFoundException('Kategori tidak ditemukan');

    Object.assign(category, dto);
    return this.categoryRepository.save(category);
  }

  async remove(userId: string, id: string): Promise<void> {
    const category = await this.categoryRepository.findOne({ where: { id, userId } });
    if (!category) throw new NotFoundException('Kategori tidak ditemukan');
    if (category.isDefault) throw new ForbiddenException('Kategori default tidak dapat dihapus');

    await this.categoryRepository.remove(category);
  }
}
