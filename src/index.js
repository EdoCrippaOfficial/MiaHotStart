'use strict'

const fp = require('fastify-plugin')

const pluginName = 'Mia Platform Plugin'

const {
  registerFastifyEnvs,
  registerFastifySwagger,
  registerLogger,
  registerMetrics,
  registerStatus,
  registerShutdown,
  registerFormBody,
} = require('./lib')

const {
  defaultLogger,
  defaultFastifyOptions,
} = require('./config')

async function plugin(fastify, opts) {
  // TODO
  //  Check opts schema with Ajv

  await registerFastifyEnvs(fastify, opts)
  await registerFastifySwagger(fastify, opts)
  await registerLogger(fastify, opts)
  await registerMetrics(fastify, opts)
  await registerStatus(fastify, opts)
  await registerShutdown(fastify, opts)
  await registerFormBody(fastify, opts)
}

module.exports = fp(plugin, {
  fastify: '4.x',
  name: pluginName,
})

module.exports.pluginName = pluginName
module.exports.defaultFastifyOptions = defaultFastifyOptions
module.exports.defaultLogger = defaultLogger
