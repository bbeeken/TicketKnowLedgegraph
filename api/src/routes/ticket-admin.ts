import { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';
import { RequestWithSql, getSqlConnection } from '../db/sql';

interface TicketTemplate {
    template_id: number;
    name: string;
    category_id: number;
    priority: string;
    severity: string;
    summary_template: string;
    description_template: string;
    checklist_items: string[] | null;
    quick_actions: string[] | null;
    auto_assign_team: number | null;
}

interface AssignmentRule {
    rule_id: number;
    name: string;
    priority: number;
    category_id: number | null;
    asset_type: string | null;
    site_id: number | null;
    min_priority: string | null;
    min_severity: string | null;
    assign_to_team: number | null;
    assign_to_user: number | null;
    is_active: boolean;
}

export async function registerTicketAdminRoutes(fastify: FastifyInstance) {
    // GET /api/ticket-templates - List all ticket templates
    fastify.get('/ticket-templates', async (request, reply) => {
        try {
            const conn = await getSqlConnection(request);
            const result = await conn.request().query(`
                SELECT * FROM app.TicketTemplates 
                ORDER BY name`);
            return result.recordset;
        } catch (err) {
            fastify.log.error(err, 'Failed to fetch ticket templates');
            return reply.code(500).send({ error: 'Failed to fetch ticket templates' });
        }
    });

    // POST /api/ticket-templates - Create new template
    fastify.post('/ticket-templates', async (request, reply) => {
        const schema = z.object({
            name: z.string(),
            category_id: z.number(),
            priority: z.string(),
            severity: z.string(),
            summary_template: z.string(),
            description_template: z.string(),
            checklist_items: z.array(z.string()).nullable(),
            quick_actions: z.array(z.string()).nullable(),
            auto_assign_team: z.number().nullable()
        });

        const body = schema.safeParse(request.body);
        if (!body.success) {
            return reply.code(400).send({ error: 'Invalid template data' });
        }

        try {
            const conn = await getSqlConnection(request);
            const result = await conn.request()
                .input('name', body.data.name)
                .input('category_id', body.data.category_id)
                .input('priority', body.data.priority)
                .input('severity', body.data.severity)
                .input('summary_template', body.data.summary_template)
                .input('description_template', body.data.description_template)
                .input('checklist_items', JSON.stringify(body.data.checklist_items))
                .input('quick_actions', JSON.stringify(body.data.quick_actions))
                .input('auto_assign_team', body.data.auto_assign_team)
                .query(`
                    INSERT INTO app.TicketTemplates (
                        name, category_id, priority, severity,
                        summary_template, description_template,
                        checklist_items, quick_actions, auto_assign_team
                    )
                    VALUES (
                        @name, @category_id, @priority, @severity,
                        @summary_template, @description_template,
                        @checklist_items, @quick_actions, @auto_assign_team
                    );
                    
                    SELECT * FROM app.TicketTemplates WHERE template_id = SCOPE_IDENTITY();
                `);

            return reply.code(201).send(result.recordset[0]);
        } catch (err) {
            fastify.log.error(err, 'Failed to create ticket template');
            return reply.code(500).send({ error: 'Failed to create ticket template' });
        }
    });

    // POST /api/tickets/from-template/:templateId
    fastify.post('/tickets/from-template/:templateId', async (request, reply) => {
        const params = z.object({
            templateId: z.string()
        }).safeParse(request.params);

        if (!params.success) {
            return reply.code(400).send({ error: 'Invalid template ID' });
        }

        const bodySchema = z.object({
            site_id: z.string(),
            asset_id: z.string().optional(),
            custom_fields: z.record(z.string()).optional()
        });

        const body = bodySchema.safeParse(request.body);
        if (!body.success) {
            return reply.code(400).send({ error: 'Invalid request data' });
        }

        try {
            const conn = await getSqlConnection(request);
            
            // First get template
            const templateResult = await conn.request()
                .input('template_id', params.data.templateId)
                .query('SELECT * FROM app.TicketTemplates WHERE template_id = @template_id');

            const template = templateResult.recordset[0] as TicketTemplate;
            if (!template) {
                return reply.code(404).send({ error: 'Template not found' });
            }

            // Replace placeholders in summary/description
            let summary = template.summary_template;
            let description = template.description_template;

            if (body.data.custom_fields) {
                Object.entries(body.data.custom_fields).forEach(([key, value]) => {
                    const placeholder = `{${key}}`;
                    summary = summary.replace(placeholder, value);
                    description = description.replace(placeholder, value);
                });
            }

            // Create ticket
            const ticketResult = await conn.request()
                .input('site_id', body.data.site_id)
                .input('asset_id', body.data.asset_id)
                .input('category_id', template.category_id)
                .input('priority', template.priority)
                .input('severity', template.severity)
                .input('summary', summary)
                .input('description', description)
                .query(`
                    DECLARE @ticket_id INT;
                    
                    INSERT INTO app.Tickets (
                        site_id, asset_id, category_id,
                        priority, severity, summary,
                        status, created_at, updated_at
                    )
                    VALUES (
                        @site_id, @asset_id, @category_id,
                        @priority, @severity, @summary,
                        'Open', SYSUTCDATETIME(), SYSUTCDATETIME()
                    );

                    SET @ticket_id = SCOPE_IDENTITY();

                    INSERT INTO app.TicketDetails (
                        ticket_id, description, update_seq,
                        created_at, updated_at
                    )
                    VALUES (
                        @ticket_id, @description, 1,
                        SYSUTCDATETIME(), SYSUTCDATETIME()
                    );

                    -- Auto-assign based on template
                    EXEC app.usp_AutoAssignTicket @ticket_id;

                    -- Add checklist items if any
                    IF @checklist_items IS NOT NULL
                    INSERT INTO app.TicketChecklists (
                        ticket_id, item_text, created_at
                    )
                    SELECT @ticket_id, value, SYSUTCDATETIME()
                    FROM OPENJSON(@checklist_items);

                    SELECT t.*, td.description
                    FROM app.Tickets t
                    JOIN app.TicketDetails td ON t.ticket_id = td.ticket_id
                    WHERE t.ticket_id = @ticket_id;
                `);

            return reply.code(201).send(ticketResult.recordset[0]);
        } catch (err) {
            fastify.log.error(err, 'Failed to create ticket from template');
            return reply.code(500).send({ error: 'Failed to create ticket from template' });
        }
    });

    // GET /api/assignment-rules - List assignment rules
    fastify.get('/assignment-rules', async (request, reply) => {
        try {
            const conn = await getSqlConnection(request);
            const result = await conn.request().query(`
                SELECT * FROM app.AssignmentRules 
                ORDER BY priority`);
            return result.recordset;
        } catch (err) {
            fastify.log.error(err, 'Failed to fetch assignment rules');
            return reply.code(500).send({ error: 'Failed to fetch assignment rules' });
        }
    });

    // POST /api/assignment-rules - Create new rule
    fastify.post('/assignment-rules', async (request, reply) => {
        const schema = z.object({
            name: z.string(),
            priority: z.number(),
            category_id: z.number().nullable(),
            asset_type: z.string().nullable(),
            site_id: z.number().nullable(),
            min_priority: z.string().nullable(),
            min_severity: z.string().nullable(),
            assign_to_team: z.number().nullable(),
            assign_to_user: z.number().nullable()
        });

        const body = schema.safeParse(request.body);
        if (!body.success) {
            return reply.code(400).send({ error: 'Invalid rule data' });
        }

        try {
            const conn = await getSqlConnection(request);
            const result = await conn.request()
                .input('name', body.data.name)
                .input('priority', body.data.priority)
                .input('category_id', body.data.category_id)
                .input('asset_type', body.data.asset_type)
                .input('site_id', body.data.site_id)
                .input('min_priority', body.data.min_priority)
                .input('min_severity', body.data.min_severity)
                .input('assign_to_team', body.data.assign_to_team)
                .input('assign_to_user', body.data.assign_to_user)
                .query(`
                    INSERT INTO app.AssignmentRules (
                        name, priority, category_id, asset_type,
                        site_id, min_priority, min_severity,
                        assign_to_team, assign_to_user
                    )
                    VALUES (
                        @name, @priority, @category_id, @asset_type,
                        @site_id, @min_priority, @min_severity,
                        @assign_to_team, @assign_to_user
                    );
                    
                    SELECT * FROM app.AssignmentRules 
                    WHERE rule_id = SCOPE_IDENTITY();
                `);

            return reply.code(201).send(result.recordset[0]);
        } catch (err) {
            fastify.log.error(err, 'Failed to create assignment rule');
            return reply.code(500).send({ error: 'Failed to create assignment rule' });
        }
    });
}
