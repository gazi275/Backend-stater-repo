import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import logger from "../../../utils/logger";
import { prisma } from "../../../utils/prisma";
import sendResponse from "../../middleware/sendResponse";

/**
 * Global search across multiple collections
 */
const globalSearch = catchAsync(async (req: Request, res: Response) => {
    const { query, type, limit = 10, page = 1 } = req.query;

    if (!query || typeof query !== "string") {
        return sendResponse(res, {
            statusCode: 400,
            success: false,
            message: "Search query is required",
        });
    }

    const searchQuery = query.toLowerCase();
    const limitNum = Number(limit);
    const skip = (Number(page) - 1) * limitNum;

    let results: any = {
        users: [],
        services: [],
        total: 0,
    };

    try {
        // Search Users (if type is not specified or type is 'users')
        if (!type || type === "users") {
            const users = await prisma.user.findMany({
                where: {
                    OR: [
                        {
                            name: {
                                contains: searchQuery,
                                mode: "insensitive",
                            },
                        },
                        {
                            email: {
                                contains: searchQuery,
                                mode: "insensitive",
                            },
                        },
                    ],
                },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    image: true,
                    status: true,
                },
                take: limitNum,
                skip: skip,
            });

            results.users = users;
        }

        // Search Services (if type is not specified or type is 'services')
        if (!type || type === "services") {
            const services = await prisma.service.findMany({
                where: {
                    OR: [
                        {
                            name: {
                                contains: searchQuery,
                                mode: "insensitive",
                            },
                        },
                        {
                            description: {
                                contains: searchQuery,
                                mode: "insensitive",
                            },
                        },
                    ],
                },
                select: {
                    id: true,
                    name: true,
                    description: true,
                    price: true,
                    image: true,
                },
                take: limitNum,
                skip: skip,
            });

            results.services = services;
        }

        // Calculate total
        results.total = results.users.length + results.services.length;

        logger.info(`Search query: "${query}" - Found ${results.total} results`);

        sendResponse(res, {
            statusCode: 200,
            success: true,
            message: "Search results fetched successfully",
            data: results,
            meta: {
                page: Number(page),
                limit: limitNum,
                total: results.total,
            },
        });
    } catch (error) {
        logger.error("Error in global search:", error);
        sendResponse(res, {
            statusCode: 500,
            success: false,
            message: "Error performing search",
        });
    }
});

/**
 * Search services with filters and sorting
 */
const searchServices = catchAsync(async (req: Request, res: Response) => {
    const {
        query,
        minPrice,
        maxPrice,
        sortBy = "createdAt",
        sortOrder = "desc",
        limit = 10,
        page = 1,
    } = req.query;

    const limitNum = Number(limit);
    const skip = (Number(page) - 1) * limitNum;

    const where: any = {};

    // Text search
    if (query && typeof query === "string") {
        where.OR = [
            {
                name: {
                    contains: query,
                    mode: "insensitive",
                },
            },
            {
                description: {
                    contains: query,
                    mode: "insensitive",
                },
            },
        ];
    }

    // Price range filter
    if (minPrice || maxPrice) {
        where.price = {};
        if (minPrice) where.price.gte = Number(minPrice);
        if (maxPrice) where.price.lte = Number(maxPrice);
    }

    const [services, total] = await Promise.all([
        prisma.service.findMany({
            where,
            include: {
                Review: {
                    select: {
                        rating: true,
                    },
                },
            },
            orderBy: {
                [sortBy as string]: sortOrder === "asc" ? "asc" : "desc",
            },
            take: limitNum,
            skip: skip,
        }),
        prisma.service.count({ where }),
    ]);

    // Calculate average ratings
    const servicesWithRatings = services.map((service) => {
        const avgRating =
            service.Review.length > 0
                ? service.Review.reduce((sum, r) => sum + r.rating, 0) /
                service.Review.length
                : 0;

        return {
            ...service,
            averageRating: Number(avgRating.toFixed(1)),
            reviewCount: service.Review.length,
            Review: undefined, // Remove the Review array from response
        };
    });

    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Services fetched successfully",
        data: servicesWithRatings,
        meta: {
            page: Number(page),
            limit: limitNum,
            total,
            totalPage: Math.ceil(total / limitNum),
        },
    });
});

/**
 * Autocomplete suggestions for search
 */
const autocomplete = catchAsync(async (req: Request, res: Response) => {
    const { query, type = "services", limit = 5 } = req.query;

    if (!query || typeof query !== "string" || query.length < 2) {
        return sendResponse(res, {
            statusCode: 400,
            success: false,
            message: "Query must be at least 2 characters",
        });
    }

    const searchQuery = query.toLowerCase();
    let suggestions: any[] = [];

    if (type === "services") {
        const services = await prisma.service.findMany({
            where: {
                name: {
                    contains: searchQuery,
                    mode: "insensitive",
                },
            },
            select: {
                id: true,
                name: true,
            },
            take: Number(limit),
        });

        suggestions = services.map((s) => ({
            id: s.id,
            label: s.name,
            type: "service",
        }));
    } else if (type === "users") {
        const users = await prisma.user.findMany({
            where: {
                OR: [
                    {
                        name: {
                            contains: searchQuery,
                            mode: "insensitive",
                        },
                    },
                    {
                        email: {
                            contains: searchQuery,
                            mode: "insensitive",
                        },
                    },
                ],
            },
            select: {
                id: true,
                name: true,
                email: true,
            },
            take: Number(limit),
        });

        suggestions = users.map((u) => ({
            id: u.id,
            label: u.name || u.email,
            type: "user",
        }));
    }

    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Autocomplete suggestions fetched successfully",
        data: suggestions,
    });
});

export const SearchController = {
    globalSearch,
    searchServices,
    autocomplete,
};
