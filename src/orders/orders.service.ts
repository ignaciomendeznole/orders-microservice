import { HttpStatus, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { PrismaClient } from '@prisma/client';
import { CreateOrderDto } from './dto/create-order.dto';
import { ChangeOrderStatusDto } from './dto/change-order-status.dto';
import { OrderPaginationDto } from 'src/common/dto/order-pagination.dto';

@Injectable()
export class OrdersService extends PrismaClient implements OnModuleInit {
  private readonly logger: Logger = new Logger('OrdersService');
  onModuleInit() {
    this.$connect();
    this.logger.log('Connected to the database');
  }

  async create(createOrderDto: CreateOrderDto) {
    const order = await this.order.create({
      data: {
        total: createOrderDto.totalAmount,
        totalItems: createOrderDto.totalItems,
        status: createOrderDto.status,
        paid: createOrderDto.paid,
      },
    });
    return order;
  }

  async findAll(orderPaginationDto: OrderPaginationDto) {
    const totalCount = await this.order.count({
      where: {
        status: orderPaginationDto.status,
      },
    });

    const currentPage = orderPaginationDto.page;
    const perPage = orderPaginationDto.limit;

    return {
      data: await this.order.findMany({
        where: {
          status: orderPaginationDto.status,
        },
        skip: (currentPage - 1) * perPage,
        take: perPage,
      }),
      meta: {
        totalCount,
        page: currentPage,
        lastPage: Math.ceil(totalCount / perPage),
      },
    };
  }

  async findOne(id: string) {
    const order = await this.order.findUnique({
      where: {
        id,
      },
    });

    if (!order) {
      throw new RpcException({
        message: `Product with id ${id} not found`,
        status: HttpStatus.NOT_FOUND,
      });
    }

    return order;
  }

  async changeOrderStatus(changeOrderStatusDto: ChangeOrderStatusDto) {
    const { id, status } = changeOrderStatusDto;

    const order = await this.findOne(id);

    if (order.status === status) {
      return order;
    }

    return this.order.update({
      where: {
        id,
      },
      data: {
        status,
      },
    });
  }
}
