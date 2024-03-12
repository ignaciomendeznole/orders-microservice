import { OrderStatus } from '@prisma/client';
import { IsBoolean, IsEnum, IsNumber, IsOptional, Min } from 'class-validator';
import { OrderStatusList } from '../enum/order.enum';

export class CreateOrderDto {
  @IsNumber()
  @Min(1)
  totalAmount: number;

  @IsNumber()
  @Min(1)
  totalItems: number;

  @IsEnum(OrderStatusList, {
    message: `Status must be one of the following: ${OrderStatusList.join(', ')}`,
  })
  @IsOptional()
  status: OrderStatus = OrderStatus.PENDING;

  @IsBoolean()
  @IsOptional()
  paid: boolean = false;
}
