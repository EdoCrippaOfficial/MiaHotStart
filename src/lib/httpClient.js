/*
 * Copyright 2022 Mia srl
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
*/

'use strict'

const axios = require('axios')
const deepmerge = require('deepmerge')

/**
 * Vuoi aggiungerti dei decoratori in più rispetto a questi a tutte le istanze?
 * Fai un factory di HttpClient in cui fai:
 *  function createHttpClient(request, baseUrl, baseOptions){
 *    const axios = request.getHttpClient(baseUrl, baseOptions)
 *    axios.interceptors.request.use(function (config) {...})
 *
 *    return axios
 *  }
 */

module.exports = async function httpClient(fastify, opts) {
  const { additionalHeadersToProxy, disableDurationInterceptor, disableLogsInterceptor } = opts?.httpClient

  function getHttpClient(baseUrl, baseOptions) {
    const platformHeadersToProxy = Object.values(opts.platformHeaders)
    const headersToProxy = platformHeadersToProxy.concat(additionalHeadersToProxy)

    const additionalHeaders = getHeadersFromRequest(this, headersToProxy)

    const axiosInstance = axios.create({
      ...baseOptions,
      headers: deepmerge(additionalHeaders, baseOptions?.headers || {}),
      baseURL: baseUrl,
    })

    if (!disableDurationInterceptor) {
      decorateResponseWithDuration(axiosInstance)
    }

    if (!disableLogsInterceptor) {
      decorateWithLogs(axiosInstance, this.log)
    }

    return axiosInstance
  }

  fastify.decorateRequest('getHttpClient', getHttpClient)
}

function getHeadersFromRequest(request, additionalHeadersToProxy) {
  return additionalHeadersToProxy.reduce((acc, header) => {
    if (request.headers[header]) {
      acc[header] = request.headers[header]
    }
    return acc
  }, {})
}

/**
 * Adds the duration field to the response object
 * @param {AxiosInstance} axiosInstance The Axios instance
 * @param {Logger} logger The logger instance
 * @returns {void} -
 */
function decorateWithLogs(axiosInstance, logger) {
  axiosInstance.interceptors.request.use(
    (config) => {
      logger?.trace({
        baseURL: config.baseURL,
        url: config.url,
        headers: config.headers,
        data: config.data,
        method: config.method,
      }, 'make call')
    })
}

/**
 * Adds the duration field to the response object
 * @param {AxiosInstance} axiosInstance The Axios instance
 * @returns {void} -
 */
function decorateResponseWithDuration(axiosInstance) {
  axiosInstance.interceptors.request.use(
    (config) => {
      config.metadata = { startTime: new Date() }
      return config
    }, (error) => {
      return Promise.reject(error)
    })

  axiosInstance.interceptors.response.use(
    (response) => {
      response.config.metadata.endTime = new Date()
      response.duration = response.config.metadata.endTime - response.config.metadata.startTime
      return response
    },
    (error) => {
      error.config.metadata.endTime = new Date()
      error.duration = error.config.metadata.endTime - error.config.metadata.startTime
      return Promise.reject(error)
    }
  )
}
