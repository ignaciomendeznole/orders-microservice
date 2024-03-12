import { OrderStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';
import { PaginationDto } from './pagination.dto';
import { OrderStatusList } from 'src/orders/enum/order.enum';

export class OrderPaginationDto extends PaginationDto {
  @IsOptional()
  @IsEnum(OrderStatusList, {
    message: `status must be a valid enum value: ${Object.values(OrderStatusList)}`,
  })
  status?: OrderStatus;
}
