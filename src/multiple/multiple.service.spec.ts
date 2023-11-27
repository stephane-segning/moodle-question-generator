import { Test, TestingModule } from '@nestjs/testing';
import { MultipleService } from './multiple.service';

describe('MultipleService', () => {
  let service: MultipleService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MultipleService],
    }).compile();

    service = module.get<MultipleService>(MultipleService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
